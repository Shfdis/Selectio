from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

import numpy as np
import scipy.sparse as sp

from .io_utils import load_npz


@dataclass(frozen=True)
class EvalResult:
    users_evaluated: int
    queries: int
    skipped_too_small: int
    recall_at: Dict[int, float]
    mrr_at: Dict[int, float]
    ndcg_at: Dict[int, float]


def _load_csr(*, artifacts: Path) -> sp.csr_matrix:
    d = load_npz(artifacts / "user_work_csr.npz")
    num_users = int(d["num_users"][0])
    num_works = int(d["num_works"][0])
    indptr = d["indptr"].astype(np.int64, copy=False)
    indices = d["indices"].astype(np.int32, copy=False)
    data = d["data"].astype(np.float32, copy=False)
    mat = sp.csr_matrix((data, indices, indptr), shape=(num_users, num_works), dtype=np.float32)
    mat.sum_duplicates()
    return mat


def _l2_normalize_rows(x: np.ndarray) -> np.ndarray:
    x = x.astype(np.float32, copy=False)
    norms = np.linalg.norm(x, axis=1, keepdims=True)
    norms = np.clip(norms, 1e-12, None)
    return x / norms


def _topk_scores(scores: np.ndarray, k: int) -> np.ndarray:
    k = int(min(max(1, k), scores.shape[0]))
    idx = np.argpartition(scores, -k)[-k:]
    idx = idx[np.argsort(-scores[idx])]
    return idx.astype(np.int32, copy=False)


def _hybrid_scores(
    *,
    cf_scores: np.ndarray,
    content_scores: np.ndarray | None,
    content_lambda: float,
) -> np.ndarray:
    if content_scores is None or float(content_lambda) <= 0.0:
        return cf_scores
    return cf_scores + float(content_lambda) * content_scores


def eval_user_to_item(
    *,
    artifacts: Path,
    work_factors_path: Path,
    user_factors_path: Path | None,
    ks: Sequence[int],
    users_sample: int,
    seed: int,
    content_vectors_path: Path | None,
    content_lambda: float,
    user_mode: str,
) -> EvalResult:
    ks = sorted({int(k) for k in ks if int(k) > 0})
    if not ks:
        raise ValueError("ks must contain at least one positive integer")
    kmax = int(max(ks))

    ui = _load_csr(artifacts=artifacts)
    num_users, num_works = ui.shape

    work_factors = np.load(str(work_factors_path)).astype(np.float32, copy=False)
    if work_factors.shape[0] != num_works:
        raise RuntimeError(
            f"work_factors rows ({work_factors.shape[0]}) != num_works ({num_works}); wrong artifacts?"
        )
    work_factors = _l2_normalize_rows(work_factors)

    user_factors = None
    if user_factors_path is not None:
        user_factors = np.load(str(user_factors_path)).astype(np.float32, copy=False)
        if user_factors.shape[0] != num_users:
            raise RuntimeError(
                f"user_factors rows ({user_factors.shape[0]}) != num_users ({num_users}); wrong artifacts?"
            )
        user_factors = _l2_normalize_rows(user_factors)

    content = None
    if content_vectors_path is not None:
        content = np.load(str(content_vectors_path)).astype(np.float32, copy=False)
        if content.shape[0] != num_works:
            raise RuntimeError(
                f"content_vectors rows ({content.shape[0]}) != num_works ({num_works}); wrong artifacts?"
            )
        content = _l2_normalize_rows(content)

    rng = np.random.default_rng(int(seed))
    users_sample = int(min(max(0, users_sample), num_users))
    if users_sample <= 0:
        users = np.arange(num_users, dtype=np.int64)
    else:
        users = rng.choice(num_users, size=users_sample, replace=False).astype(np.int64)

    hits_at = {k: 0 for k in ks}
    rr_at = {k: 0.0 for k in ks}
    ndcg_at = {k: 0.0 for k in ks}
    skipped_too_small = 0
    queries = 0

    indptr = ui.indptr
    indices = ui.indices

    for u in users.tolist():
        s = int(indptr[u])
        e = int(indptr[u + 1])
        items = indices[s:e]
        if items.size < 2:
            skipped_too_small += 1
            continue

        # Hold out one work for evaluation.
        i = int(rng.integers(0, items.size))
        heldout = int(items[i])
        train_items = np.delete(items, i)

        if str(user_mode) == "als_user":
            if user_factors is None:
                raise RuntimeError("user_mode=als_user requires --user_factors")
            prof = user_factors[int(u)]
            cf_scores = work_factors @ prof
        else:
            # Baseline: average of liked-item vectors
            prof = work_factors[train_items.astype(np.int64)].mean(axis=0)
            n = float(np.linalg.norm(prof))
            if not np.isfinite(n) or n <= 0:
                skipped_too_small += 1
                continue
            prof = (prof / n).astype(np.float32, copy=False)
            cf_scores = work_factors @ prof

        content_scores = None
        if content is not None and float(content_lambda) > 0.0:
            cprof = content[train_items.astype(np.int64)].mean(axis=0)
            cn = float(np.linalg.norm(cprof))
            if np.isfinite(cn) and cn > 0.0:
                cprof = (cprof / cn).astype(np.float32, copy=False)
                content_scores = content @ cprof

        scores = _hybrid_scores(cf_scores=cf_scores, content_scores=content_scores, content_lambda=float(content_lambda))
        # exclude training items and heldout? exclude train, keep heldout
        scores[train_items.astype(np.int64)] = -np.inf

        topk = _topk_scores(scores, k=int(kmax))
        queries += 1

        pos = np.where(topk == heldout)[0]
        rank0 = int(pos[0]) if pos.size else None

        for k in ks:
            if rank0 is None:
                continue
            if rank0 < k:
                hits_at[k] += 1
                rr_at[k] += 1.0 / float(rank0 + 1)
                ndcg_at[k] += 1.0 / float(np.log2(rank0 + 2))

    recall_at = {k: (hits_at[k] / float(queries)) if queries else float("nan") for k in ks}
    mrr_at = {k: (rr_at[k] / float(queries)) if queries else float("nan") for k in ks}
    ndcg_out = {k: (ndcg_at[k] / float(queries)) if queries else float("nan") for k in ks}
    return EvalResult(
        users_evaluated=int(users.shape[0]),
        queries=int(queries),
        skipped_too_small=int(skipped_too_small),
        recall_at=recall_at,
        mrr_at=mrr_at,
        ndcg_at=ndcg_out,
    )


def eval_item_to_item(
    *,
    artifacts: Path,
    work_factors_path: Path,
    ks: Sequence[int],
    users_sample: int,
    seed: int,
    content_vectors_path: Path | None,
    content_lambda: float,
) -> EvalResult:
    ks = sorted({int(k) for k in ks if int(k) > 0})
    if not ks:
        raise ValueError("ks must contain at least one positive integer")
    kmax = int(max(ks))

    ui = _load_csr(artifacts=artifacts)
    num_users, num_works = ui.shape

    work_factors = np.load(str(work_factors_path)).astype(np.float32, copy=False)
    if work_factors.shape[0] != num_works:
        raise RuntimeError(
            f"work_factors rows ({work_factors.shape[0]}) != num_works ({num_works}); wrong artifacts?"
        )
    work_factors = _l2_normalize_rows(work_factors)

    content = None
    if content_vectors_path is not None:
        content = np.load(str(content_vectors_path)).astype(np.float32, copy=False)
        if content.shape[0] != num_works:
            raise RuntimeError(
                f"content_vectors rows ({content.shape[0]}) != num_works ({num_works}); wrong artifacts?"
            )
        content = _l2_normalize_rows(content)

    rng = np.random.default_rng(int(seed))
    users_sample = int(min(max(0, users_sample), num_users))
    if users_sample <= 0:
        users = np.arange(num_users, dtype=np.int64)
    else:
        users = rng.choice(num_users, size=users_sample, replace=False).astype(np.int64)

    hits_at = {k: 0 for k in ks}
    rr_at = {k: 0.0 for k in ks}
    ndcg_at = {k: 0.0 for k in ks}
    skipped_too_small = 0
    queries = 0

    indptr = ui.indptr
    indices = ui.indices

    for u in users.tolist():
        s = int(indptr[u])
        e = int(indptr[u + 1])
        items = indices[s:e]
        if items.size < 2:
            skipped_too_small += 1
            continue

        i, j = rng.choice(items.size, size=2, replace=False).tolist()
        query = int(items[i])
        heldout = int(items[j])

        cf_scores = work_factors @ work_factors[query]
        content_scores = None
        if content is not None and float(content_lambda) > 0.0:
            content_scores = content @ content[query]

        scores = _hybrid_scores(
            cf_scores=cf_scores, content_scores=content_scores, content_lambda=float(content_lambda)
        )
        scores[query] = -np.inf
        topk = _topk_scores(scores, k=int(kmax))
        queries += 1

        pos = np.where(topk == heldout)[0]
        rank0 = int(pos[0]) if pos.size else None
        for k in ks:
            if rank0 is None:
                continue
            if rank0 < k:
                hits_at[k] += 1
                rr_at[k] += 1.0 / float(rank0 + 1)
                ndcg_at[k] += 1.0 / float(np.log2(rank0 + 2))

    recall_at = {k: (hits_at[k] / float(queries)) if queries else float("nan") for k in ks}
    mrr_at = {k: (rr_at[k] / float(queries)) if queries else float("nan") for k in ks}
    ndcg_out = {k: (ndcg_at[k] / float(queries)) if queries else float("nan") for k in ks}
    return EvalResult(
        users_evaluated=int(users.shape[0]),
        queries=int(queries),
        skipped_too_small=int(skipped_too_small),
        recall_at=recall_at,
        mrr_at=mrr_at,
        ndcg_at=ndcg_out,
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="Offline evaluation for work-level recommenders.")
    ap.add_argument("--artifacts", required=True, help="Matrix artifacts directory")
    ap.add_argument(
        "--work_factors",
        default="als_work_factors.npy",
        help="Path to factors .npy (default: als_work_factors.npy under artifacts)",
    )
    ap.add_argument(
        "--user_factors",
        default="",
        help="Optional path to user factors .npy (e.g. als_user_factors.npy). If provided, you can use --user_mode als_user.",
    )
    ap.add_argument(
        "--user_mode",
        choices=["avg_items", "als_user"],
        default="avg_items",
        help="How to score user->item: avg_items (baseline) or als_user (use learned user factors).",
    )
    ap.add_argument(
        "--content_vectors",
        default="",
        help="Optional path to work_content_vectors.npy (default: none).",
    )
    ap.add_argument(
        "--content_lambda",
        type=float,
        default=0.0,
        help="Hybrid weight for content similarity (0 disables).",
    )
    ap.add_argument("--mode", choices=["user_to_item", "item_to_item"], default="user_to_item")
    ap.add_argument("--k", type=int, action="append", default=[10, 20, 50])
    ap.add_argument("--users_sample", type=int, default=5000, help="0=all")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    artifacts = Path(args.artifacts)
    work_factors_path = Path(str(args.work_factors))
    if not work_factors_path.is_absolute():
        work_factors_path = artifacts / work_factors_path

    content_vectors_path = None
    if str(args.content_vectors).strip():
        p = Path(str(args.content_vectors).strip())
        if not p.is_absolute():
            p = artifacts / p
        content_vectors_path = p

    user_factors_path = None
    if str(args.user_factors).strip():
        p = Path(str(args.user_factors).strip())
        if not p.is_absolute():
            p = artifacts / p
        user_factors_path = p

    if str(args.mode) == "user_to_item":
        res = eval_user_to_item(
            artifacts=artifacts,
            work_factors_path=work_factors_path,
            user_factors_path=user_factors_path,
            ks=args.k,
            users_sample=int(args.users_sample),
            seed=int(args.seed),
            content_vectors_path=content_vectors_path,
            content_lambda=float(args.content_lambda),
            user_mode=str(args.user_mode),
        )
    else:
        res = eval_item_to_item(
            artifacts=artifacts,
            work_factors_path=work_factors_path,
            ks=args.k,
            users_sample=int(args.users_sample),
            seed=int(args.seed),
            content_vectors_path=content_vectors_path,
            content_lambda=float(args.content_lambda),
        )

    print(f"[INFO] mode={args.mode} users_evaluated={res.users_evaluated} queries={res.queries}")
    print(f"[INFO] skipped_too_small={res.skipped_too_small}")
    for k in sorted(res.recall_at.keys()):
        print(
            f"[METRIC] Recall@{k}={res.recall_at[k]:.4f} "
            f"MRR@{k}={res.mrr_at[k]:.4f} "
            f"NDCG@{k}={res.ndcg_at[k]:.4f}"
        )


if __name__ == "__main__":
    main()

