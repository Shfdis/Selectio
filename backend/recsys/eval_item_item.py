#!/usr/bin/env python3
"""
Item-item evaluation after training: compute Recall@K with relevance = top-K by co-count in test.
Requires: artifacts/user_work_matrix.npz, user_work_matrix_index.npz, item_embeddings.npz.
Run after build_item_embeddings.py.
"""
import argparse
import os
import sys

import numpy as np

from als_utils import (
    item_to_item_recall_multi_k,
    load_matrix,
    train_test_split,
)

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MATRIX_PATH = os.path.join(ARTIFACTS_DIR, "user_work_matrix.npz")
INDEX_PATH = os.path.join(ARTIFACTS_DIR, "user_work_matrix_index.npz")
EMBEDDINGS_PATH = os.path.join(ARTIFACTS_DIR, "item_embeddings.npz")


def load_embeddings(path: str) -> tuple[list, np.ndarray]:
    """Load work_id array and embedding matrix from npz. Return (work_ids, embeddings)."""
    data = np.load(path, allow_pickle=True)
    work_ids = data["work_id"].tolist()
    embeddings = np.asarray(data["embedding"], dtype=np.float32)
    return work_ids, embeddings


def main():
    parser = argparse.ArgumentParser(
        description="Item-item evaluation: Recall@K (relevance = top-K by co-count in test)."
    )
    parser.add_argument(
        "--test-ratio",
        type=float,
        default=0.2,
        help="Fraction of interactions (or per-user) to hold out as test (default: 0.2).",
    )
    parser.add_argument(
        "--split-by-user",
        action="store_true",
        default=True,
        help="Hold out test_ratio per user (default: True).",
    )
    parser.add_argument(
        "--no-split-by-user",
        action="store_false",
        dest="split_by_user",
        help="Random global split instead of per-user.",
    )
    parser.add_argument(
        "--max-eval-items",
        type=int,
        default=5000,
        metavar="N",
        help="Cap number of items to evaluate; keep low so validation stays under training time (default: 5000).",
    )
    parser.add_argument(
        "--k",
        type=int,
        nargs="+",
        default=[5, 10, 20, 50],
        metavar="K",
        help="K values for Recall@K (default: 5 10 20 50).",
    )
    parser.add_argument(
        "--max-relevant-per-item",
        type=int,
        default=50,
        metavar="K",
        help="For each item i, relevant set = top-K items j by co-count in test (default: 50).",
    )
    parser.add_argument(
        "--eval-batch-size",
        type=int,
        default=10000,
        metavar="N",
        help="Chunk size for evaluation (default: 10000).",
    )
    parser.add_argument(
        "--max-test-pairs-for-relevance",
        type=int,
        default=200000,
        metavar="N",
        help="Cap test pairs used to build relevance; speeds up validation on huge test sets (default: 200000).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for split and sampling (default: 42).",
    )
    args = parser.parse_args()

    k_values = tuple(args.k)
    if not k_values or any(k <= 0 for k in k_values):
        print("Error: --k must be positive integers.", file=sys.stderr)
        sys.exit(1)

    if not os.path.isfile(MATRIX_PATH) or not os.path.isfile(INDEX_PATH):
        print(
            "Error: matrix or index not found. Run build_user_work_matrix.py first.",
            file=sys.stderr,
        )
        sys.exit(1)
    if not os.path.isfile(EMBEDDINGS_PATH):
        print(
            "Error: item_embeddings.npz not found. Run build_item_embeddings.py first.",
            file=sys.stderr,
        )
        sys.exit(1)

    print("Loading matrix and index...", flush=True)
    matrix, user_ids, work_ids_index = load_matrix(MATRIX_PATH, INDEX_PATH)
    print(f"  Shape: {matrix.shape}, nnz: {matrix.nnz:,}", flush=True)

    print("Train/test split...", flush=True)
    train_matrix, test_pairs = train_test_split(
        matrix,
        test_ratio=args.test_ratio,
        random_state=args.seed,
        split_by_user=args.split_by_user,
    )
    print(f"  Test pairs: {len(test_pairs):,}", flush=True)

    print("Loading embeddings...", flush=True)
    work_ids_npz, embeddings = load_embeddings(EMBEDDINGS_PATH)
    if len(work_ids_npz) != len(work_ids_index) or list(work_ids_npz) != list(work_ids_index):
        print(
            "Error: embedding work_id order does not match matrix index. Re-run build_item_embeddings.py.",
            file=sys.stderr,
        )
        sys.exit(1)
    print(f"  Embeddings: {embeddings.shape}", flush=True)

    class ModelWrapper:
        """Expose .item_factors for recall eval (same order as matrix columns)."""
        pass

    wrapper = ModelWrapper()
    wrapper.item_factors = embeddings

    print("Computing Recall@K (top-K by co-count in test)...", flush=True)
    results = item_to_item_recall_multi_k(
        wrapper,
        train_matrix,
        test_pairs,
        k_values=k_values,
        max_eval_items=args.max_eval_items,
        random_state=args.seed,
        both_liked_only=True,
        show_progress=True,
        min_relevant=2,
        max_relevant_per_item=args.max_relevant_per_item,
        eval_batch_size=args.eval_batch_size,
        max_test_pairs_for_relevance=args.max_test_pairs_for_relevance,
    )

    print("\nItem-item Recall@K (relevance = top-{} by co-count in test):".format(args.max_relevant_per_item), flush=True)
    for k in k_values:
        print(f"  Recall@{k}: {results[k]:.4f}", flush=True)


if __name__ == "__main__":
    main()
