#!/usr/bin/env python3
"""
Build artifacts/user_work_matrix.npz from Goodreads interactions.
User-work sparse matrix: rows=users, cols=works.
Filter: works with >= 50 interactions; users with >= 5 interactions in kept works.
Values: in [0, 1] (rating 0,1,2,3 -> 0.1; 4,5 -> 0.55, 1.0). Optional --max-works N for top N works.
"""
import argparse
import gzip
import json
import os
from collections import defaultdict

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, save_npz

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MATRIX_PATH = os.path.join(ARTIFACTS_DIR, "user_work_matrix.npz")
MIN_INTERACTIONS_PER_WORK = 50
MIN_INTERACTIONS_PER_USER = 5
CHUNK_SIZE = 10_000_000


def build_book_id_to_work_id(books_path: str) -> dict:
    """Stream goodreads_books.json.gz -> book_id (Goodreads) -> work_id."""
    book_to_work = {}
    n = 0
    with gzip.open(books_path, "rt", encoding="utf-8") as f:
        for line in f:
            n += 1
            if n % 300_000 == 0:
                print(f"  books streamed: {n:,} ...", flush=True)
            if not line.strip():
                continue
            d = json.loads(line)
            book_id = d.get("book_id")
            work_id = d.get("work_id")
            if book_id is not None and work_id is not None:
                book_to_work[str(book_id)] = str(work_id)
    return book_to_work


def main():
    parser = argparse.ArgumentParser(description="Build user-work matrix from Goodreads interactions.")
    parser.add_argument(
        "--max-works",
        type=int,
        default=None,
        metavar="N",
        help="Keep only the top N most popular works (by interaction count). Default: all works with >= 50 interactions.",
    )
    args = parser.parse_args()
    max_works = args.max_works

    books_path = os.path.join(DATA_DIR, "goodreads_books.json.gz")
    book_map_path = os.path.join(DATA_DIR, "book_id_map.csv")
    interactions_path = os.path.join(DATA_DIR, "goodreads_interactions.csv")

    print("Building book_id (Goodreads) -> work_id...", flush=True)
    book_to_work = build_book_id_to_work_id(books_path)
    print(f"  {len(book_to_work):,} books with work_id", flush=True)

    print("Loading book_id_map (book_id_csv -> book_id)...", flush=True)
    df_map = pd.read_csv(book_map_path, index_col=0)
    book_id_series = df_map["book_id"].astype(str)
    print(f"  {len(book_id_series):,} book_id_csv entries", flush=True)

    # ----- Pass 1: count interactions per work and per user (vectorized) -----
    print("Pass 1: counting interactions per work and per user...", flush=True)
    work_counts = defaultdict(int)
    user_counts = defaultdict(int)
    total_rows = 0
    for chunk in pd.read_csv(interactions_path, chunksize=CHUNK_SIZE):
        chunk["work_id"] = chunk["book_id"].map(book_id_series).map(book_to_work)
        chunk = chunk.dropna(subset=["work_id"])
        chunk["work_id"] = chunk["work_id"].astype(str)
        total_rows += len(chunk)
        if total_rows % 40_000_000 == 0 and total_rows > 0:
            print(f"  {total_rows:,} rows...", flush=True)
        for w, c in chunk["work_id"].value_counts().items():
            work_counts[w] += c
        for u, c in chunk["user_id"].value_counts().items():
            user_counts[u] += c

    works_kept = {w for w, c in work_counts.items() if c >= MIN_INTERACTIONS_PER_WORK}
    if max_works is not None:
        candidates = sorted(
            [(w, work_counts[w]) for w in works_kept],
            key=lambda x: -x[1],
        )
        works_kept = {w for w, _ in candidates[:max_works]}
        print(f"  Using top {max_works} works by interaction count: {len(works_kept):,}", flush=True)
    work_list = sorted(works_kept)
    work_to_idx = {w: i for i, w in enumerate(work_list)}
    print(f"  total rows (with work_id): {total_rows:,}", flush=True)
    print(f"  works kept: {len(works_kept):,}", flush=True)

    # ----- Pass 1.5: count per-user interactions only with works_kept -----
    print("Pass 1.5: counting user interactions in kept works...", flush=True)
    user_counts_in_kept = defaultdict(int)
    total_rows_15 = 0
    for chunk in pd.read_csv(interactions_path, chunksize=CHUNK_SIZE):
        n_read = len(chunk)
        total_rows_15 += n_read
        if total_rows_15 % 40_000_000 == 0 and total_rows_15 > 0:
            print(f"  {total_rows_15:,} rows read...", flush=True)
        chunk["work_id"] = chunk["book_id"].map(book_id_series).map(book_to_work)
        chunk = chunk.dropna(subset=["work_id"])
        chunk["work_id"] = chunk["work_id"].astype(str)
        chunk = chunk[chunk["work_id"].isin(works_kept)]
        if chunk.empty:
            continue
        for u, c in chunk["user_id"].value_counts().items():
            user_counts_in_kept[u] += c
    users_kept = {u for u, c in user_counts_in_kept.items() if c >= MIN_INTERACTIONS_PER_USER}
    user_list = sorted(users_kept)
    user_to_idx = {u: i for i, u in enumerate(user_list)}
    print(f"  users with >= {MIN_INTERACTIONS_PER_USER} interactions in kept works: {len(users_kept):,}", flush=True)

    # ----- Pass 2: accumulate (user, work, val) per chunk, then single final groupby -----
    print("Pass 2: building (user, work) -> max value in [0, 1]...", flush=True)
    df_list = []
    total_rows2 = 0
    for chunk in pd.read_csv(interactions_path, chunksize=CHUNK_SIZE):
        n_chunk = len(chunk)
        total_rows2 += n_chunk
        if total_rows2 % 40_000_000 == 0 and total_rows2 > 0:
            print(f"  {total_rows2:,} rows...", flush=True)
        chunk = chunk[chunk["user_id"].isin(users_kept)]
        if chunk.empty:
            continue
        chunk["work_id"] = chunk["book_id"].map(book_id_series).map(book_to_work)
        chunk = chunk.dropna(subset=["work_id"])
        chunk["work_id"] = chunk["work_id"].astype(str)
        chunk = chunk[chunk["work_id"].isin(works_kept)]
        if chunk.empty:
            continue
        rating = chunk["rating"].fillna(0).astype(np.float64)
        chunk["val"] = np.where(
            rating >= 4,
            np.clip(0.1 + 0.9 * (rating - 3) / 2.0, 0.1, 1.0),
            0.1,
        )
        grouped = chunk[["user_id", "work_id", "val"]].groupby(
            ["user_id", "work_id"], as_index=False
        )["val"].max()
        df_list.append(grouped)

    print("  concatenating and taking global max per (user, work)...", flush=True)
    concat_df = pd.concat(df_list, ignore_index=True)
    final = concat_df.groupby(["user_id", "work_id"], as_index=False)["val"].max()

    rows = final["user_id"].map(user_to_idx).values.astype(np.int64)
    cols = final["work_id"].map(work_to_idx).values.astype(np.int64)
    data = final["val"].values.astype(np.float64)

    matrix = csr_matrix(
        (data, (rows, cols)),
        shape=(len(user_list), len(work_list)),
        dtype=np.float64,
    )

    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    save_npz(MATRIX_PATH, matrix)

    np.savez(
        os.path.join(ARTIFACTS_DIR, "user_work_matrix_index.npz"),
        user_id_csv=np.array(user_list, dtype=np.int64),
        work_id=np.array(work_list, dtype=object),
    )

    print(f"Matrix shape: {matrix.shape} (users x works)", flush=True)
    print(f"Nonzeros: {matrix.nnz:,}", flush=True)
    print(f"Values in [0, 1]", flush=True)
    print(f"Saved matrix to {MATRIX_PATH}", flush=True)
    print(f"Saved index mapping to artifacts/user_work_matrix_index.npz", flush=True)


if __name__ == "__main__":
    main()
