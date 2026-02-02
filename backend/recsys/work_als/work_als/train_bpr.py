from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import scipy.sparse as sp

from .io_utils import load_npz, write_json


def _load_csr(path: Path) -> sp.csr_matrix:
    d = load_npz(path)
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
    return (x / norms).astype(np.float32, copy=False)


def main() -> None:
    ap = argparse.ArgumentParser(description="Train implicit BPR on work-level user×work matrix.")
    ap.add_argument("--artifacts", required=True, help="Artifacts directory from build_matrix.py")
    ap.add_argument("--factors", type=int, default=256)
    ap.add_argument("--iterations", type=int, default=200)
    ap.add_argument("--learning_rate", type=float, default=0.05)
    ap.add_argument("--regularization", type=float, default=0.01)
    ap.add_argument(
        "--weighting",
        choices=["none", "bm25", "tfidf"],
        default="bm25",
        help="Pre-weight user×work matrix to reduce heavy-tail bias.",
    )
    ap.add_argument("--bm25_k1", type=float, default=1.2)
    ap.add_argument("--bm25_b", type=float, default=0.75)
    args = ap.parse_args()

    artifacts = Path(args.artifacts)
    ui = _load_csr(artifacts / "user_work_csr.npz")

    if str(args.weighting) == "bm25":
        from implicit.nearest_neighbours import bm25_weight  # type: ignore

        ui = bm25_weight(ui, K1=float(args.bm25_k1), B=float(args.bm25_b)).tocsr()
    elif str(args.weighting) == "tfidf":
        from implicit.nearest_neighbours import tfidf_weight  # type: ignore

        ui = tfidf_weight(ui).tocsr()

    from implicit.bpr import BayesianPersonalizedRanking  # type: ignore

    model = BayesianPersonalizedRanking(
        factors=int(args.factors),
        iterations=int(args.iterations),
        learning_rate=float(args.learning_rate),
        regularization=float(args.regularization),
        verify_negative_samples=True,
    )
    model.fit(ui)

    user_factors = _l2_normalize_rows(model.user_factors.astype(np.float32, copy=False))
    item_factors = _l2_normalize_rows(model.item_factors.astype(np.float32, copy=False))

    np.save(str(artifacts / "bpr_user_factors.npy"), user_factors)
    np.save(str(artifacts / "bpr_work_factors.npy"), item_factors)
    write_json(
        artifacts / "bpr_report.json",
        {
            "model": "implicit.bpr.BayesianPersonalizedRanking",
            "factors": int(args.factors),
            "iterations": int(args.iterations),
            "learning_rate": float(args.learning_rate),
            "regularization": float(args.regularization),
            "weighting": str(args.weighting),
            "bm25_k1": float(args.bm25_k1),
            "bm25_b": float(args.bm25_b),
            "num_users": int(ui.shape[0]),
            "num_works": int(ui.shape[1]),
            "nnz": int(ui.nnz),
        },
    )
    print(f"[OK] wrote: {artifacts/'bpr_work_factors.npy'}", flush=True)


if __name__ == "__main__":
    main()

