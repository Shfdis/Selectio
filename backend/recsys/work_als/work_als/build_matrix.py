from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.csv as pacsv
import scipy.sparse as sp
from tqdm import tqdm

from .io_utils import ensure_dir, load_npz, resolve_path_maybe_from_git_root, save_npz, write_json


INTERACTIONS_SCHEMA = pa.schema(
    [
        ("user_id", pa.int64()),
        ("book_id", pa.int64()),
        ("is_read", pa.int8()),
        ("rating", pa.int16()),
        ("is_reviewed", pa.int8()),
    ]
)


def _open_csv(path: str) -> pacsv.CSVStreamingReader:
    path = str(resolve_path_maybe_from_git_root(path))
    return pacsv.open_csv(
        path,
        read_options=pacsv.ReadOptions(use_threads=True, block_size=1 << 26),  # 64MiB
        parse_options=pacsv.ParseOptions(delimiter=","),
        convert_options=pacsv.ConvertOptions(column_types=INTERACTIONS_SCHEMA, strings_can_be_null=True),
    )


def _rating_strength(rating: np.ndarray) -> np.ndarray:
    # f(rating)=max(rating-2,0)/3 in [0..1] for rating in {0..5}
    r = rating.astype(np.float32, copy=False)
    return np.clip((r - 2.0) / 3.0, 0.0, 1.0)


def _interaction_mask(*, is_read: pa.Array, is_reviewed: pa.Array, signal: str) -> pa.Array:
    if signal == "read":
        return pc.equal(is_read, pa.scalar(1, pa.int8()))
    if signal == "reviewed":
        return pc.equal(is_reviewed, pa.scalar(1, pa.int8()))
    if signal == "read_or_reviewed":
        return pc.or_(
            pc.equal(is_read, pa.scalar(1, pa.int8())),
            pc.equal(is_reviewed, pa.scalar(1, pa.int8())),
        )
    raise ValueError(f"Unknown signal={signal!r}")


def _map_book_to_work(
    *, book_ids: np.ndarray, map_book_ids: np.ndarray, map_work_ids: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Vectorized mapping book_id -> work_id using sorted mapping arrays.

    Returns (work_ids, ok_mask).
    """
    book_ids = book_ids.astype(np.int64, copy=False)
    pos = np.searchsorted(map_book_ids, book_ids)
    # IMPORTANT: searchsorted can return len(map_book_ids) for out-of-range book_ids.
    # We must avoid indexing map_book_ids[pos] unless pos is in-bounds.
    ok = pos < map_book_ids.shape[0]
    if np.any(ok):
        ok2 = np.zeros_like(ok, dtype=bool)
        ok2[ok] = map_book_ids[pos[ok]] == book_ids[ok]
        ok = ok2
    work_ids = np.full(book_ids.shape[0], -1, dtype=np.int64)
    work_ids[ok] = map_work_ids[pos[ok]]
    return work_ids, ok


def _np_unique_counts_int64(x: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    if x.size == 0:
        return np.empty(0, dtype=np.int64), np.empty(0, dtype=np.int64)
    u, c = np.unique(x, return_counts=True)
    return u.astype(np.int64, copy=False), c.astype(np.int64, copy=False)


def pass1_count_works(
    *,
    interactions_csv: str,
    map_book_ids: np.ndarray,
    map_work_ids: np.ndarray,
    signal: str,
    max_batches: int = 0,
) -> Dict[int, int]:
    reader = _open_csv(interactions_csv)
    counts: Dict[int, int] = {}

    for i, batch in enumerate(tqdm(reader, desc=f"Pass1: counting {signal} per work"), start=1):
        if int(max_batches) > 0 and i > int(max_batches):
            break
        is_read = batch.column("is_read")
        is_reviewed = batch.column("is_reviewed")
        mask_signal = _interaction_mask(is_read=is_read, is_reviewed=is_reviewed, signal=signal)
        if pc.all(pc.invert(mask_signal)).as_py():
            continue

        book_ids = batch.column("book_id").filter(mask_signal).to_numpy(zero_copy_only=False)
        work_ids, ok = _map_book_to_work(
            book_ids=book_ids, map_book_ids=map_book_ids, map_work_ids=map_work_ids
        )
        work_ids = work_ids[ok]
        if work_ids.size == 0:
            continue
        u, c = _np_unique_counts_int64(work_ids)
        for wid, cnt in zip(u.tolist(), c.tolist()):
            counts[int(wid)] = counts.get(int(wid), 0) + int(cnt)

    if not counts:
        raise RuntimeError("No interactions mapped to works; check mapping + signal.")
    return counts


def pass2_count_users(
    *,
    interactions_csv: str,
    map_book_ids: np.ndarray,
    map_work_ids: np.ndarray,
    keep_work_ids: set[int],
    signal: str,
    max_batches: int = 0,
) -> Dict[int, int]:
    reader = _open_csv(interactions_csv)
    counts: Dict[int, int] = {}
    keep_work_ids_arr = np.asarray(sorted(keep_work_ids), dtype=np.int64)

    for i, batch in enumerate(tqdm(reader, desc=f"Pass2: counting user {signal} on kept works"), start=1):
        if int(max_batches) > 0 and i > int(max_batches):
            break
        is_read = batch.column("is_read")
        is_reviewed = batch.column("is_reviewed")
        mask_signal = _interaction_mask(is_read=is_read, is_reviewed=is_reviewed, signal=signal)
        if pc.all(pc.invert(mask_signal)).as_py():
            continue

        user_ids = batch.column("user_id")
        book_ids = batch.column("book_id")
        # Map to work_ids first (numpy), then filter by keep_work_ids.
        f_user = user_ids.filter(mask_signal).to_numpy(zero_copy_only=False).astype(np.int64, copy=False)
        f_book = book_ids.filter(mask_signal).to_numpy(zero_copy_only=False).astype(np.int64, copy=False)
        work_ids, ok = _map_book_to_work(book_ids=f_book, map_book_ids=map_book_ids, map_work_ids=map_work_ids)
        if not np.any(ok):
            continue
        f_user = f_user[ok]
        work_ids = work_ids[ok]
        # keep only chosen works
        m_keep = np.isin(work_ids, keep_work_ids_arr)
        if not np.any(m_keep):
            continue
        f_user = f_user[m_keep]
        if f_user.size == 0:
            continue
        u, c = _np_unique_counts_int64(f_user)
        for uid, cnt in zip(u.tolist(), c.tolist()):
            counts[int(uid)] = counts.get(int(uid), 0) + int(cnt)
    return counts


def pass3_build_csr(
    *,
    interactions_csv: str,
    map_book_ids: np.ndarray,
    map_work_ids: np.ndarray,
    keep_work_ids_sorted: np.ndarray,
    keep_user_ids_sorted: np.ndarray,
    signal: str,
    rating_boost: float,
    review_boost: float,
    max_batches: int = 0,
) -> sp.csr_matrix:
    reader = _open_csv(interactions_csv)

    # For fast vectorized id->index mapping we use searchsorted on sorted arrays.
    keep_work_ids_sorted = keep_work_ids_sorted.astype(np.int64, copy=False)
    keep_user_ids_sorted = keep_user_ids_sorted.astype(np.int64, copy=False)

    rows: list[np.ndarray] = []
    cols: list[np.ndarray] = []
    data: list[np.ndarray] = []

    for i, batch in enumerate(tqdm(reader, desc="Pass3: building CSR (COO accumulation)"), start=1):
        if int(max_batches) > 0 and i > int(max_batches):
            break
        is_read = batch.column("is_read")
        is_reviewed = batch.column("is_reviewed")
        mask_signal = _interaction_mask(is_read=is_read, is_reviewed=is_reviewed, signal=signal)
        if pc.all(pc.invert(mask_signal)).as_py():
            continue

        f_user = batch.column("user_id").filter(mask_signal).to_numpy(zero_copy_only=False).astype(np.int64)
        f_book = batch.column("book_id").filter(mask_signal).to_numpy(zero_copy_only=False).astype(np.int64)
        f_rating = batch.column("rating").filter(mask_signal).to_numpy(zero_copy_only=False)
        f_is_reviewed = is_reviewed.filter(mask_signal).to_numpy(zero_copy_only=False)

        work_ids, ok = _map_book_to_work(book_ids=f_book, map_book_ids=map_book_ids, map_work_ids=map_work_ids)
        if not np.any(ok):
            continue
        f_user = f_user[ok]
        work_ids = work_ids[ok]
        f_rating = f_rating[ok]
        f_is_reviewed = f_is_reviewed[ok]

        # Map ids to indices; filter out-of-vocab.
        u_pos = np.searchsorted(keep_user_ids_sorted, f_user)
        u_ok = u_pos < keep_user_ids_sorted.shape[0]
        if np.any(u_ok):
            u_ok2 = np.zeros_like(u_ok, dtype=bool)
            u_ok2[u_ok] = keep_user_ids_sorted[u_pos[u_ok]] == f_user[u_ok]
            u_ok = u_ok2
        w_pos = np.searchsorted(keep_work_ids_sorted, work_ids)
        w_ok = w_pos < keep_work_ids_sorted.shape[0]
        if np.any(w_ok):
            w_ok2 = np.zeros_like(w_ok, dtype=bool)
            w_ok2[w_ok] = keep_work_ids_sorted[w_pos[w_ok]] == work_ids[w_ok]
            w_ok = w_ok2
        m = u_ok & w_ok
        if not np.any(m):
            continue

        u_idx = u_pos[m].astype(np.int32, copy=False)
        w_idx = w_pos[m].astype(np.int32, copy=False)

        strength = _rating_strength(np.maximum(f_rating[m].astype(np.int16, copy=False), 0))
        w = 1.0 + float(rating_boost) * strength
        if float(review_boost) != 0.0:
            w = w + float(review_boost) * (f_is_reviewed[m].astype(np.float32) > 0).astype(np.float32)

        rows.append(u_idx)
        cols.append(w_idx)
        data.append(w.astype(np.float32, copy=False))

    if not rows:
        raise RuntimeError("No edges produced in Pass3; check thresholds/signal/mapping.")

    r = np.concatenate(rows)
    c = np.concatenate(cols)
    x = np.concatenate(data)
    num_users = int(keep_user_ids_sorted.shape[0])
    num_works = int(keep_work_ids_sorted.shape[0])
    mat = sp.coo_matrix((x, (r, c)), shape=(num_users, num_works), dtype=np.float32).tocsr()
    mat.sum_duplicates()
    return mat


def main() -> None:
    ap = argparse.ArgumentParser(description="Build work-level user×work implicit matrix from Goodreads data.")
    ap.add_argument("--interactions", default="../data/goodreads_interactions.csv")
    ap.add_argument("--mapping", required=True, help="Artifacts dir containing book_to_work.npz")
    ap.add_argument("--out", required=True, help="Output artifacts directory")
    ap.add_argument(
        "--signal",
        choices=["read", "reviewed", "read_or_reviewed"],
        default="read_or_reviewed",
        help="What constitutes a positive interaction edge.",
    )
    ap.add_argument("--min_work_interactions", type=int, default=50)
    ap.add_argument("--min_user_interactions", type=int, default=5)
    ap.add_argument("--max_user_interactions", type=int, default=0)
    ap.add_argument("--rating_boost", type=float, default=0.5)
    ap.add_argument("--review_boost", type=float, default=0.25)
    ap.add_argument(
        "--max_batches",
        type=int,
        default=0,
        help="For smoke tests only: stop after N pyarrow CSV batches per pass (0=all).",
    )
    args = ap.parse_args()

    out_dir = ensure_dir(args.out)
    mapping_dir = Path(args.mapping)
    interactions_path = str(resolve_path_maybe_from_git_root(args.interactions))

    m = load_npz(mapping_dir / "book_to_work.npz")
    map_book_ids = m["book_id"].astype(np.int64, copy=False)
    map_work_ids = m["work_id"].astype(np.int64, copy=False)

    work_counts = pass1_count_works(
        interactions_csv=interactions_path,
        map_book_ids=map_book_ids,
        map_work_ids=map_work_ids,
        signal=str(args.signal),
        max_batches=int(args.max_batches),
    )
    min_w = int(max(1, args.min_work_interactions))
    keep_work_ids = {wid for wid, c in work_counts.items() if int(c) >= min_w}

    user_counts = pass2_count_users(
        interactions_csv=interactions_path,
        map_book_ids=map_book_ids,
        map_work_ids=map_work_ids,
        keep_work_ids=keep_work_ids,
        signal=str(args.signal),
        max_batches=int(args.max_batches),
    )
    min_u = int(max(1, args.min_user_interactions))
    max_u = int(args.max_user_interactions)
    if max_u > 0:
        keep_user_ids = {uid for uid, c in user_counts.items() if min_u <= int(c) <= max_u}
    else:
        keep_user_ids = {uid for uid, c in user_counts.items() if int(c) >= min_u}

    keep_work_ids_sorted = np.asarray(sorted(keep_work_ids), dtype=np.int64)
    keep_user_ids_sorted = np.asarray(sorted(keep_user_ids), dtype=np.int64)

    ui = pass3_build_csr(
        interactions_csv=interactions_path,
        map_book_ids=map_book_ids,
        map_work_ids=map_work_ids,
        keep_work_ids_sorted=keep_work_ids_sorted,
        keep_user_ids_sorted=keep_user_ids_sorted,
        signal=str(args.signal),
        rating_boost=float(args.rating_boost),
        review_boost=float(args.review_boost),
        max_batches=int(args.max_batches),
    )

    save_npz(
        out_dir / "user_work_csr.npz",
        indptr=ui.indptr.astype(np.int64, copy=False),
        indices=ui.indices.astype(np.int32, copy=False),
        data=ui.data.astype(np.float32, copy=False),
        num_users=np.asarray([ui.shape[0]], dtype=np.int64),
        num_works=np.asarray([ui.shape[1]], dtype=np.int64),
    )
    write_json(out_dir / "index_to_user_id.json", [int(x) for x in keep_user_ids_sorted.tolist()])
    write_json(out_dir / "index_to_work_id.json", [int(x) for x in keep_work_ids_sorted.tolist()])

    report = {
        "signal": str(args.signal),
        "min_work_interactions": int(min_w),
        "min_user_interactions": int(min_u),
        "max_user_interactions": int(max_u),
        "rating_boost": float(args.rating_boost),
        "review_boost": float(args.review_boost),
        "num_users": int(ui.shape[0]),
        "num_works": int(ui.shape[1]),
        "num_edges": int(ui.nnz),
    }
    write_json(out_dir / "matrix_report.json", report)
    print(f"[OK] wrote: {out_dir/'user_work_csr.npz'}", flush=True)
    print(f"[OK] wrote: {out_dir/'matrix_report.json'}", flush=True)


if __name__ == "__main__":
    main()

