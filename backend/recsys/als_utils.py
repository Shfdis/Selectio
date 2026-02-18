"""
ALS utilities for Goodreads user-work matrix.
- Load matrix and index
- Subsample for fast sweep
- Build ALS model (implicit)
- Item-to-item NDCG and Recall evaluation
"""
import math
import random
import sys
from collections import Counter, defaultdict
from typing import Optional

import numpy as np
from scipy.sparse import csr_matrix, load_npz
from tqdm import tqdm

try:
    from implicit.als import AlternatingLeastSquares
except ImportError:
    AlternatingLeastSquares = None


def load_matrix(matrix_path: str, index_path: str) -> tuple[csr_matrix, np.ndarray, np.ndarray]:
    """Load CSR matrix and index (user_ids, work_ids). Return (matrix, user_ids, work_ids)."""
    matrix = load_npz(matrix_path)
    if not isinstance(matrix, csr_matrix):
        matrix = matrix.tocsr()
    index = np.load(index_path, allow_pickle=True)
    user_ids = index["user_id_csv"] if "user_id_csv" in index else index["user_id"]
    work_ids = index["work_id"]
    return matrix, user_ids, work_ids


def subsample_matrix_for_sweep(
    matrix: csr_matrix,
    max_users: int,
    max_items: int,
    random_state: Optional[int] = 42,
) -> csr_matrix:
    """
    Select top users/items by nnz, slice matrix, drop empty rows/cols.
    Return subsampled CSR for fast sweep iterations.
    """
    if random_state is not None:
        rng = np.random.default_rng(random_state)
    else:
        rng = np.random.default_rng()

    n_users, n_items = matrix.shape
    user_nnz = np.array((matrix != 0).sum(axis=1)).flatten()
    item_nnz = np.array((matrix != 0).sum(axis=0)).flatten()

    user_ranks = np.argsort(-user_nnz)
    item_ranks = np.argsort(-item_nnz)

    user_mask = user_ranks[:max_users]
    item_mask = item_ranks[:max_items]

    sub = matrix[user_mask, :][:, item_mask]
    sub = sub.tocsr()

    # Drop empty rows and cols
    row_nnz = np.array((sub != 0).sum(axis=1)).flatten()
    col_nnz = np.array((sub != 0).sum(axis=0)).flatten()
    keep_rows = row_nnz > 0
    keep_cols = col_nnz > 0
    sub = sub[keep_rows, :][:, keep_cols]
    return sub.tocsr()


def build_als_from_matrix(
    matrix: csr_matrix,
    user_ids: np.ndarray,
    work_ids: np.ndarray,
    factors: int = 32,
    iterations: int = 20,
    regularization: float = 0.01,
    random_state: Optional[int] = None,
    use_positive_only: bool = True,
    alpha: float = 1.0,
    show_progress: bool = True,
):
    """
    Fit ALS (Alternating Least Squares) on user-items matrix using the implicit library.
    If use_positive_only=True (default): keep only value>0 interactions (confidence matrix).
    Returns a wrapper with .item_factors (n_items, factors) in work_ids order for compatibility
    with embeddings and NDCG eval.
    """
    if AlternatingLeastSquares is None:
        raise ImportError("implicit is required for ALS. Install with: pip install implicit")

    if use_positive_only:
        matrix = matrix.multiply(matrix > 0).tocsr()
        matrix.eliminate_zeros()

    model = AlternatingLeastSquares(
        factors=factors,
        regularization=regularization,
        iterations=iterations,
        alpha=alpha,
        random_state=random_state,
    )
    model.fit(matrix, show_progress=show_progress)

    class ALSWrapper:
        """Expose .item_factors for compatibility with item embeddings and NDCG eval."""
        pass

    wrapper = ALSWrapper()
    wrapper.item_factors = np.asarray(model.item_factors, dtype=np.float32)
    return wrapper


def _idcg_lookup(max_k: int) -> list[float]:
    """Precompute IDCG@k for n_rel=1..max_k."""
    return [sum(1.0 / math.log2(p + 1) for p in range(1, n + 1)) for n in range(max_k + 1)]


def _dcg_discounts(max_k: int) -> list[float]:
    """Precompute 1/log2(p+1) for p=1..max_k."""
    return [1.0 / math.log2(p + 1) for p in range(1, max_k + 1)]


def item_to_item_ndcg_multi_k(
    model,
    train_matrix: csr_matrix,
    test_pairs: list[tuple[int, int, float]],
    k_values: tuple[int, ...] = (10, 50),
    max_eval_items: Optional[int] = None,
    random_state: Optional[int] = 42,
    both_liked_only: bool = True,
    show_progress: bool = True,
    min_relevant: int = 2,
    use_graded_relevance: bool = True,
) -> dict[int, float]:
    """
    Compute NDCG@k for multiple k in one pass. Relevant = co-occurring liked in test.
    Only items with at least min_relevant co-occurring test items are evaluated (stricter).
    If use_graded_relevance=True, uses test values (0..1) as relevance grades in DCG/IDCG.
    Uses a single batch matrix multiply for recommendations (much faster than similar_items loop).
    """
    rng = np.random.default_rng(random_state)
    max_k = max(k_values)
    idcg_lut = _idcg_lookup(max_k)
    dcg_discounts = _dcg_discounts(max_k)

    if show_progress:
        print("  Building relevance from test pairs...", flush=True)
    user_items: dict[int, list[tuple[int, float]]] = {}
    for u, i, val in test_pairs:
        if u not in user_items:
            user_items[u] = []
        user_items[u].append((i, val))

    item_relevant: dict[int, set[int]] = {}
    item_relevant_grades: dict[int, dict[int, float]] = {}
    for u, items_with_vals in user_items.items():
        liked = [i for i, v in items_with_vals if v > 0] if both_liked_only else [i for i, _ in items_with_vals]
        liked_set = set(liked)
        item_to_val = dict(items_with_vals)
        for i in liked:
            item_relevant.setdefault(i, set()).update(liked_set - {i})
            for j in liked_set - {i}:
                vj = item_to_val.get(j, 0.0)
                if i not in item_relevant_grades:
                    item_relevant_grades[i] = {}
                item_relevant_grades[i][j] = max(item_relevant_grades[i].get(j, 0.0), vj)

    # Stricter: only evaluate items with at least min_relevant co-occurring test items
    eval_items = np.array([i for i, rel in item_relevant.items() if len(rel) >= min_relevant], dtype=np.intp)
    if len(eval_items) == 0:
        return {k: 0.0 for k in k_values}

    if show_progress:
        rel_sizes = [len(item_relevant[i]) for i in eval_items]
        size_counts = Counter(rel_sizes)
        print(f"  Evaluating on {len(eval_items):,} items (min_relevant={min_relevant}); relevance sizes: {dict(sorted(size_counts.items()))}", flush=True)

    if max_eval_items is not None and len(eval_items) > max_eval_items:
        eval_items = rng.choice(eval_items, size=max_eval_items, replace=False)

    if show_progress:
        print("  Computing recommendations (batch)...", flush=True)
    factors = model.item_factors
    if hasattr(factors, "to_numpy"):
        factors = factors.to_numpy()
    factors = np.asarray(factors, dtype=np.float32)
    scores = factors[eval_items] @ factors.T
    scores[np.arange(len(eval_items)), eval_items] = -np.inf
    top_k_idx = np.argsort(-scores, axis=1)[:, :max_k]

    if show_progress:
        print("  Computing NDCG...", flush=True)
    totals: dict[int, float] = {k: 0.0 for k in k_values}
    n_eval = len(eval_items)

    for idx in tqdm(
        range(n_eval),
        desc="NDCG eval",
        leave=False,
        disable=not show_progress,
        file=sys.stderr,
        mininterval=0.5,
        unit="item",
    ):
        item_id = int(eval_items[idx])
        relevant = item_relevant[item_id]
        top_k = top_k_idx[idx]
        grades_dict = item_relevant_grades.get(item_id, {})
        if use_graded_relevance:
            grades_sorted = sorted(grades_dict.values(), reverse=True)
        for k in k_values:
            if use_graded_relevance:
                dcg = 0.0
                for p, rec in enumerate(top_k[:k], start=1):
                    grade = grades_dict.get(int(rec), 0.0)
                    dcg += grade * dcg_discounts[p - 1]
                n_top = min(len(grades_sorted), k)
                idcg = sum(grades_sorted[p] * dcg_discounts[p] for p in range(n_top)) if n_top else 0.0
            else:
                dcg = 0.0
                for p, rec in enumerate(top_k[:k], start=1):
                    if int(rec) in relevant:
                        dcg += dcg_discounts[p - 1]
                n_rel = min(len(relevant), k)
                idcg = idcg_lut[n_rel]
            ndcg_i = dcg / idcg if idcg > 0 else 0.0
            totals[k] += ndcg_i

    return {k: totals[k] / n_eval if n_eval > 0 else 0.0 for k in k_values}


def item_to_item_ndcg_at_k(
    model,
    train_matrix: csr_matrix,
    test_pairs: list[tuple[int, int, float]],
    k: int,
    max_eval_items: Optional[int] = None,
    random_state: Optional[int] = 42,
    both_liked_only: bool = True,
    show_progress: bool = True,
    min_relevant: int = 2,
    use_graded_relevance: bool = True,
) -> float:
    """
    Item-to-item NDCG@K. Relevant items = co-occurring liked items in test set.
    DCG@K = sum(rel_p / log2(p+1)); IDCG@K = sum for p=1..min(|R|,K) of 1/log2(p+1).
    If use_graded_relevance=True, uses test values (0..1) as relevance grades.
    """
    result = item_to_item_ndcg_multi_k(
        model, train_matrix, test_pairs, k_values=(k,),
        max_eval_items=max_eval_items, random_state=random_state,
        both_liked_only=both_liked_only, show_progress=show_progress,
        min_relevant=min_relevant, use_graded_relevance=use_graded_relevance,
    )
    return result[k]


def _build_item_relevant_top_k_by_cocount(
    test_pairs: list[tuple[int, int, float]],
    max_relevant_per_item: int,
    both_liked_only: bool,
    max_test_pairs: Optional[int] = None,
    random_state: Optional[int] = None,
) -> dict[int, set[int]]:
    """
    Build item_relevant so that for each item i, relevant = top max_relevant_per_item
    items j by co-count in test (number of users who have both (i, j) in test).
    If max_test_pairs is set and len(test_pairs) > max_test_pairs, sample test_pairs
    down to that size (faster relevance build on huge test sets).
    """
    pairs = test_pairs
    if max_test_pairs is not None and len(test_pairs) > max_test_pairs:
        rng = np.random.default_rng(random_state)
        idx = rng.choice(len(test_pairs), size=max_test_pairs, replace=False)
        pairs = [test_pairs[i] for i in idx]
    user_items: dict[int, list[tuple[int, float]]] = {}
    for u, i, val in pairs:
        if u not in user_items:
            user_items[u] = []
        user_items[u].append((i, val))

    co_count: dict[tuple[int, int], int] = defaultdict(int)
    for u, items_with_vals in user_items.items():
        liked = (
            [i for i, v in items_with_vals if v > 0]
            if both_liked_only
            else [i for i, _ in items_with_vals]
        )
        for i in liked:
            for j in liked:
                if i != j:
                    pair = (i, j) if i < j else (j, i)
                    co_count[pair] += 1

    # For each i, collect (j, count) and take top max_relevant_per_item by count
    item_relevant: dict[int, set[int]] = {}
    for (i, j), count in co_count.items():
        for node in (i, j):
            other = j if node == i else i
            if node not in item_relevant:
                item_relevant[node] = []
            item_relevant[node].append((other, count))

    for i in list(item_relevant.keys()):
        pairs = item_relevant[i]
        pairs.sort(key=lambda x: -x[1])
        top_j = [j for j, _ in pairs[:max_relevant_per_item]]
        item_relevant[i] = set(top_j)

    return item_relevant


def item_to_item_recall_multi_k(
    model,
    train_matrix: csr_matrix,
    test_pairs: list[tuple[int, int, float]],
    k_values: tuple[int, ...] = (5, 10, 20, 50),
    max_eval_items: Optional[int] = None,
    random_state: Optional[int] = 42,
    both_liked_only: bool = True,
    show_progress: bool = True,
    min_relevant: int = 2,
    max_relevant_per_item: int = 50,
    eval_batch_size: int = 5000,
    max_test_pairs_for_relevance: Optional[int] = None,
) -> dict[int, float]:
    """
    Compute Recall@k for multiple k. Relevant for item i = top max_relevant_per_item
    items j by co-count in test (number of users who have both (i, j) in test).
    Uses chunked evaluation to bound memory. Set max_test_pairs_for_relevance to
    cap test pairs used for relevance (faster when test is huge).
    """
    rng = np.random.default_rng(random_state)
    max_k = max(k_values)

    if show_progress:
        print("  Building relevance (top-K by co-count in test)...", flush=True)
    item_relevant = _build_item_relevant_top_k_by_cocount(
        test_pairs,
        max_relevant_per_item,
        both_liked_only,
        max_test_pairs=max_test_pairs_for_relevance,
        random_state=random_state,
    )

    eval_items = np.array(
        [i for i, rel in item_relevant.items() if len(rel) >= min_relevant],
        dtype=np.intp,
    )
    if len(eval_items) == 0:
        return {k: 0.0 for k in k_values}

    if show_progress:
        rel_sizes = [len(item_relevant[i]) for i in eval_items]
        size_counts = Counter(rel_sizes)
        print(
            f"  Evaluating on {len(eval_items):,} items (min_relevant={min_relevant}, max_relevant_per_item={max_relevant_per_item}); relevance sizes: {dict(sorted(size_counts.items())[:10])}",
            flush=True,
        )

    if max_eval_items is not None and len(eval_items) > max_eval_items:
        eval_items = rng.choice(eval_items, size=max_eval_items, replace=False)

    factors = model.item_factors
    if hasattr(factors, "to_numpy"):
        factors = factors.to_numpy()
    factors = np.asarray(factors, dtype=np.float32)
    n_items = factors.shape[0]

    totals: dict[int, float] = {k: 0.0 for k in k_values}
    n_eval_done = 0

    for start in range(0, len(eval_items), eval_batch_size):
        end = min(start + eval_batch_size, len(eval_items))
        chunk = eval_items[start:end]
        chunk_size = len(chunk)

        scores = factors[chunk] @ factors.T
        scores[np.arange(chunk_size), chunk] = -np.inf
        top_k_idx = np.argsort(-scores, axis=1)[:, :max_k]

        for idx in range(chunk_size):
            item_id = int(chunk[idx])
            relevant = item_relevant[item_id]
            top_k = top_k_idx[idx]
            n_rel = len(relevant)
            if n_rel == 0:
                continue
            hits_prefix = np.array(
                [1 if int(top_k[p]) in relevant else 0 for p in range(max_k)],
                dtype=np.float64,
            )
            np.cumsum(hits_prefix, out=hits_prefix)
            for k in k_values:
                totals[k] += (hits_prefix[k - 1] / n_rel)
        n_eval_done += chunk_size
        if show_progress and (end % (eval_batch_size * 2) == 0 or end == len(eval_items)):
            print(f"  Recall eval: {end:,} / {len(eval_items):,} items", flush=True)

    return {
        k: totals[k] / n_eval_done if n_eval_done > 0 else 0.0
        for k in k_values
    }


def item_to_item_recall_at_k(
    model,
    train_matrix: csr_matrix,
    test_pairs: list[tuple[int, int, float]],
    k: int,
    max_eval_items: Optional[int] = None,
    random_state: Optional[int] = 42,
    both_liked_only: bool = True,
    show_progress: bool = True,
    min_relevant: int = 2,
    max_relevant_per_item: int = 50,
    eval_batch_size: int = 5000,
    max_test_pairs_for_relevance: Optional[int] = None,
) -> float:
    """Recall@K for item-to-item; relevant = top-K by co-count in test."""
    result = item_to_item_recall_multi_k(
        model,
        train_matrix,
        test_pairs,
        k_values=(k,),
        max_eval_items=max_eval_items,
        random_state=random_state,
        both_liked_only=both_liked_only,
        show_progress=show_progress,
        min_relevant=min_relevant,
        max_relevant_per_item=max_relevant_per_item,
        eval_batch_size=eval_batch_size,
        max_test_pairs_for_relevance=max_test_pairs_for_relevance,
    )
    return result[k]


def train_test_split(
    matrix: csr_matrix,
    test_ratio: float = 0.2,
    random_state: Optional[int] = 42,
    split_by_user: bool = False,
) -> tuple[csr_matrix, list[tuple[int, int]]]:
    """
    Split matrix into train and test.
    Returns (train_matrix, test_pairs) where test_pairs are (user_idx, work_idx).

    - split_by_user=False: random 80/20 of (row, col, data) pairs
    - split_by_user=True: for each user, hold out test_ratio of their interactions
    """
    rng = random.Random(random_state) if random_state is not None else random.Random()

    coo = matrix.tocoo()
    rows = np.asarray(coo.row).copy()
    cols = np.asarray(coo.col).copy()
    data = np.asarray(coo.data).copy()

    n_nonzero = len(rows)
    indices = np.arange(n_nonzero)

    if split_by_user:
        # Group by user, then for each user sample test_ratio of their pairs
        user_to_idx = {}
        for i in range(n_nonzero):
            u = rows[i]
            if u not in user_to_idx:
                user_to_idx[u] = []
            user_to_idx[u].append(i)

        test_indices = []
        for u, idx_list in user_to_idx.items():
            n_test = max(1, int(len(idx_list) * test_ratio))
            test_indices.extend(rng.sample(idx_list, min(n_test, len(idx_list))))

        test_indices = set(test_indices)
        train_mask = np.array([i not in test_indices for i in range(n_nonzero)])
    else:
        rng.shuffle(indices)
        n_test = int(n_nonzero * test_ratio)
        test_indices = set(indices[:n_test])
        train_mask = np.array([i not in test_indices for i in range(n_nonzero)])

    train_rows = rows[train_mask]
    train_cols = cols[train_mask]
    train_data = data[train_mask]
    train_matrix = csr_matrix(
        (train_data, (train_rows, train_cols)),
        shape=matrix.shape,
        dtype=matrix.dtype,
    )

    # test_pairs: (user_idx, work_idx, value) for both-liked filtering in recall
    test_pairs = [
        (int(rows[i]), int(cols[i]), float(data[i]))
        for i in range(n_nonzero)
        if i in test_indices
    ]

    return train_matrix, test_pairs
