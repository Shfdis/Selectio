#!/usr/bin/env python3
"""
Build item embeddings from ALS on the user-work matrix (implicit backend).
Uses fixed config: factors=32, iterations=20, regularization=0.01.
Writes artifacts/item_embeddings.npz (work_id, embedding) and artifacts/item_embeddings_config.json.
"""
import json
import os
import sys

import numpy as np

from als_utils import build_als_from_matrix, load_matrix

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MATRIX_PATH = os.path.join(ARTIFACTS_DIR, "user_work_matrix.npz")
INDEX_PATH = os.path.join(ARTIFACTS_DIR, "user_work_matrix_index.npz")
EMBEDDINGS_PATH = os.path.join(ARTIFACTS_DIR, "item_embeddings.npz")
CONFIG_PATH = os.path.join(ARTIFACTS_DIR, "item_embeddings_config.json")

CONFIG = {
    "factors": 62,
    "iterations": 20,
    "regularization": 0.01,
    "alpha": 2
}
RANDOM_STATE = 42


def main():
    if not os.path.isfile(MATRIX_PATH) or not os.path.isfile(INDEX_PATH):
        print("Error: matrix or index file not found. Run build_user_work_matrix.py first.", file=sys.stderr)
        sys.exit(1)

    print("Loading matrix...", flush=True)
    matrix, user_ids, work_ids = load_matrix(MATRIX_PATH, INDEX_PATH)
    print(f"  Shape: {matrix.shape}, nnz: {matrix.nnz:,}", flush=True)

    print("Training ALS...", flush=True)
    model = build_als_from_matrix(
        matrix,
        user_ids,
        work_ids,
        random_state=RANDOM_STATE,
        **CONFIG,
    )

    factors = model.item_factors
    if hasattr(factors, "to_numpy"):
        factors = factors.to_numpy()
    embedding = np.asarray(factors, dtype=np.float32)
    assert embedding.shape[0] == len(work_ids) and embedding.shape[1] == CONFIG["factors"]

    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    np.savez(EMBEDDINGS_PATH, work_id=work_ids, embedding=embedding)
    print(f"Saved {EMBEDDINGS_PATH} (work_id, embedding)", flush=True)

    with open(CONFIG_PATH, "w") as f:
        json.dump(CONFIG, f, indent=2)
    print(f"Saved {CONFIG_PATH}", flush=True)


if __name__ == "__main__":
    main()
