from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import numpy as np

from .io_utils import load_npz, read_json, resolve_path_maybe_from_git_root


def _l2_normalize(x: np.ndarray) -> np.ndarray:
    x = x.astype(np.float32, copy=False)
    n = float(np.linalg.norm(x))
    if not np.isfinite(n) or n <= 0:
        return x
    return (x / n).astype(np.float32, copy=False)


def _parse_int_list(s: str) -> List[int]:
    s = (s or "").strip()
    if not s:
        return []
    out: List[int] = []
    for part in s.split(","):
        part = part.strip()
        if not part:
            continue
        out.append(int(part))
    return out


def _work_ids_from_book_ids(*, book_ids: Sequence[int], mapping_npz: Path) -> List[int]:
    m = load_npz(mapping_npz)
    map_book_ids = m["book_id"].astype(np.int64, copy=False)
    map_work_ids = m["work_id"].astype(np.int64, copy=False)
    b = np.asarray(list(book_ids), dtype=np.int64)
    pos = np.searchsorted(map_book_ids, b)
    ok = pos < map_book_ids.shape[0]
    if np.any(ok):
        ok2 = np.zeros_like(ok, dtype=bool)
        ok2[ok] = map_book_ids[pos[ok]] == b[ok]
        ok = ok2
    return [int(x) for x in map_work_ids[pos[ok]].tolist()]


def recommend_from_liked_works(
    *,
    work_ids: np.ndarray,  # [N]
    work_factors: np.ndarray,  # [N,D] L2-normalized
    liked_work_ids: Sequence[int],
    topn: int,
    candidate_pool: int,
    content_vectors: np.ndarray | None,
    content_lambda: float,
) -> List[Tuple[int, float]]:
    liked = set(int(x) for x in liked_work_ids)
    if not liked:
        raise ValueError("No liked works provided")

    # Map liked work_ids to indices in this model
    where = {int(w): i for i, w in enumerate(work_ids.tolist())}
    idx = [where[w] for w in liked if w in where]
    if not idx:
        raise ValueError("None of the liked works are present in the model artifacts")

    prof = _l2_normalize(np.mean(work_factors[np.asarray(idx, dtype=np.int64)], axis=0))
    sims = work_factors @ prof  # cosine similarity

    # Exclude already-liked works
    for w in liked:
        j = where.get(int(w))
        if j is not None:
            sims[int(j)] = -np.inf

    pool = int(max(topn, candidate_pool))
    pool = int(min(pool, work_ids.shape[0] - 1))
    cand = np.argpartition(sims, -pool)[-pool:]
    cand = cand[np.argsort(-sims[cand])]

    if content_vectors is not None and float(content_lambda) > 0.0:
        if content_vectors.shape[0] != work_factors.shape[0]:
            raise RuntimeError("content_vectors rowcount mismatch")
        cprof = _l2_normalize(np.mean(content_vectors[np.asarray(idx, dtype=np.int64)], axis=0))
        csims = content_vectors[cand] @ cprof
        score = sims[cand] + float(content_lambda) * csims
        order = np.argsort(-score)
        cand = cand[order]
        score = score[order]
        out = [(int(work_ids[i]), float(s)) for i, s in zip(cand[:topn].tolist(), score[:topn].tolist())]
        return out

    out = [(int(work_ids[i]), float(sims[i])) for i in cand[:topn].tolist()]
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Offline recommender: liked works -> recommended works.")
    ap.add_argument("--artifacts", required=True, help="Matrix artifacts dir (contains als_work_factors.npy)")
    ap.add_argument(
        "--mapping",
        default="",
        help="Optional mapping dir (contains work_to_representative_book.json, book_to_work.npz)",
    )
    ap.add_argument("--liked_work_ids", default="", help="Comma-separated work_ids the user likes")
    ap.add_argument("--liked_book_ids", default="", help="Comma-separated book_ids; mapped to work_ids if mapping is provided")
    ap.add_argument("--topn", type=int, default=20)
    ap.add_argument("--candidate_pool", type=int, default=1000)
    ap.add_argument(
        "--content",
        choices=["off", "on"],
        default="on",
        help="If on, use work_content_vectors.npy if present to hybrid-rerank.",
    )
    ap.add_argument("--content_lambda", type=float, default=0.25)
    args = ap.parse_args()

    artifacts = Path(args.artifacts)
    work_ids = np.asarray(read_json(artifacts / "index_to_work_id.json"), dtype=np.int64)
    work_factors = np.load(str(artifacts / "als_work_factors.npy")).astype(np.float32, copy=False)

    liked_work_ids = _parse_int_list(str(args.liked_work_ids))

    mapping_dir = str(args.mapping).strip()
    rep_map: Dict[int, int] = {}
    if mapping_dir:
        mapping_dir_path = Path(resolve_path_maybe_from_git_root(mapping_dir))
        rep_map = {int(k): int(v) for k, v in read_json(mapping_dir_path / "work_to_representative_book.json").items()}
        liked_book_ids = _parse_int_list(str(args.liked_book_ids))
        if liked_book_ids:
            liked_work_ids.extend(
                _work_ids_from_book_ids(book_ids=liked_book_ids, mapping_npz=mapping_dir_path / "book_to_work.npz")
            )

    liked_work_ids = sorted(set(int(x) for x in liked_work_ids))

    content_vectors = None
    if str(args.content) == "on":
        p = artifacts / "work_content_vectors.npy"
        if p.exists():
            content_vectors = np.load(str(p)).astype(np.float32, copy=False)

    recs = recommend_from_liked_works(
        work_ids=work_ids,
        work_factors=work_factors,
        liked_work_ids=liked_work_ids,
        topn=int(args.topn),
        candidate_pool=int(args.candidate_pool),
        content_vectors=content_vectors,
        content_lambda=float(args.content_lambda),
    )

    for r, (wid, score) in enumerate(recs, start=1):
        rep = rep_map.get(int(wid))
        if rep is not None:
            print(f"{r:02d}. work_id={wid} rep_book_id={rep} score={score:.4f}")
        else:
            print(f"{r:02d}. work_id={wid} score={score:.4f}")


if __name__ == "__main__":
    main()

