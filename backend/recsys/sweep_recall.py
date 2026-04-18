#!/usr/bin/env python3
"""
Hyperparameter sweep by Recall@50: train ALS on a grid of (factors, iterations, regularization, alpha),
evaluate each config with Recall@50, report best config.
Uses one train/test split; trains on train_matrix only (no test leakage).
Requires: artifacts/user_work_matrix.npz, user_work_matrix_index.npz.
"""
import argparse
import csv
import itertools
import os
import sys

from als_utils import (
    build_als_from_matrix,
    item_to_item_recall_at_k,
    load_matrix,
    train_test_split,
)

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MATRIX_PATH = os.path.join(ARTIFACTS_DIR, "user_work_matrix.npz")
INDEX_PATH = os.path.join(ARTIFACTS_DIR, "user_work_matrix_index.npz")


def main():
    parser = argparse.ArgumentParser(
        description="Hyperparameter sweep: train ALS on grid, select best by Recall@50."
    )
    parser.add_argument(
        "--factors",
        type=int,
        nargs="+",
        default=[32],
        metavar="F",
        help="ALS factors (default: 32).",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        nargs="+",
        default=[20],
        metavar="N",
        help="ALS iterations (default: 20).",
    )
    parser.add_argument(
        "--regularization",
        type=float,
        nargs="+",
        default=[0.01],
        metavar="R",
        help="ALS regularization (default: 0.01).",
    )
    parser.add_argument(
        "--alpha",
        type=float,
        nargs="+",
        default=[1.0],
        metavar="A",
        help="ALS alpha (default: 1.0).",
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
        "--seed",
        type=int,
        default=42,
        help="Random seed for split and sampling (default: 42).",
    )
    parser.add_argument(
        "--max-eval-items",
        type=int,
        default=5000,
        metavar="N",
        help="Cap number of items to evaluate per config (default: 5000).",
    )
    parser.add_argument(
        "--max-test-pairs-for-relevance",
        type=int,
        default=200000,
        metavar="N",
        help="Cap test pairs used to build relevance (default: 200000).",
    )
    parser.add_argument(
        "--max-relevant-per-item",
        type=int,
        default=50,
        metavar="K",
        help="Top-K items by co-count in test for relevance (default: 50).",
    )
    parser.add_argument(
        "--eval-batch-size",
        type=int,
        default=10000,
        metavar="N",
        help="Chunk size for evaluation (default: 10000).",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        metavar="PATH",
        help="Write results to CSV (columns: factors, iterations, regularization, alpha, recall50).",
    )
    args = parser.parse_args()

    configs = list(
        itertools.product(
            args.factors,
            args.iterations,
            args.regularization,
            args.alpha,
        )
    )
    if not configs:
        print("Error: at least one value per hyperparameter.", file=sys.stderr)
        sys.exit(1)

    if not os.path.isfile(MATRIX_PATH) or not os.path.isfile(INDEX_PATH):
        print(
            "Error: matrix or index not found. Run build_user_work_matrix.py first.",
            file=sys.stderr,
        )
        sys.exit(1)

    print("Loading matrix and index...", flush=True)
    matrix, user_ids, work_ids = load_matrix(MATRIX_PATH, INDEX_PATH)
    print(f"  Shape: {matrix.shape}, nnz: {matrix.nnz:,}", flush=True)

    print("Train/test split...", flush=True)
    train_matrix, test_pairs = train_test_split(
        matrix,
        test_ratio=args.test_ratio,
        random_state=args.seed,
        split_by_user=args.split_by_user,
    )
    print(f"  Test pairs: {len(test_pairs):,}", flush=True)

    results = []
    for i, (factors, iterations, regularization, alpha) in enumerate(configs):
        config = {
            "factors": factors,
            "iterations": iterations,
            "regularization": regularization,
            "alpha": alpha,
        }
        print(
            f"\n[{i + 1}/{len(configs)}] factors={factors} iterations={iterations} regularization={regularization} alpha={alpha}",
            flush=True,
        )
        print("  Training ALS on train_matrix...", flush=True)
        model = build_als_from_matrix(
            train_matrix,
            user_ids,
            work_ids,
            factors=factors,
            iterations=iterations,
            regularization=regularization,
            alpha=alpha,
            random_state=args.seed,
            use_positive_only=True,
            show_progress=True,
        )
        print("  Evaluating Recall@50...", flush=True)
        recall50 = item_to_item_recall_at_k(
            model,
            train_matrix,
            test_pairs,
            k=50,
            max_eval_items=args.max_eval_items,
            random_state=args.seed,
            both_liked_only=True,
            show_progress=True,
            min_relevant=2,
            max_relevant_per_item=args.max_relevant_per_item,
            eval_batch_size=args.eval_batch_size,
            max_test_pairs_for_relevance=args.max_test_pairs_for_relevance,
        )
        results.append((config, recall50))
        print(f"  Recall@50: {recall50:.4f}", flush=True)

    print("\n" + "=" * 60, flush=True)
    print("Sweep results (Recall@50)", flush=True)
    print("=" * 60, flush=True)
    for config, recall50 in results:
        print(
            f"  factors={config['factors']} iterations={config['iterations']} "
            f"regularization={config['regularization']} alpha={config['alpha']} -> Recall@50: {recall50:.4f}",
            flush=True,
        )

    best_config, best_recall = max(results, key=lambda x: x[1])
    print("\nBest config (by Recall@50):", flush=True)
    print(
        f"  factors={best_config['factors']} iterations={best_config['iterations']} "
        f"regularization={best_config['regularization']} alpha={best_config['alpha']} -> Recall@50: {best_recall:.4f}",
        flush=True,
    )

    if args.output:
        out_path = args.output
        os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
        with open(out_path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["factors", "iterations", "regularization", "alpha", "recall50"])
            for config, recall50 in results:
                w.writerow(
                    [
                        config["factors"],
                        config["iterations"],
                        config["regularization"],
                        config["alpha"],
                        f"{recall50:.6f}",
                    ]
                )
        print(f"\nWrote {out_path}", flush=True)


if __name__ == "__main__":
    main()
