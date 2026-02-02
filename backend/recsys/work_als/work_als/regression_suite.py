from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Set, Tuple

import numpy as np

from .io_utils import read_json, resolve_path_maybe_from_git_root


def _loads(b: bytes) -> dict:
    try:
        import orjson  # type: ignore

        return orjson.loads(b)
    except Exception:
        return json.loads(b.decode("utf-8"))


def _iter_jsonl_gz(path: Path) -> Iterable[dict]:
    with gzip.open(path, "rb") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield _loads(line)


def _parse_int_list(s: str) -> List[int]:
    s = (s or "").strip()
    if not s:
        return []
    return [int(x.strip()) for x in s.split(",") if x.strip()]


def _l2_normalize_rows(x: np.ndarray) -> np.ndarray:
    x = x.astype(np.float32, copy=False)
    norms = np.linalg.norm(x, axis=1, keepdims=True)
    norms = np.clip(norms, 1e-12, None)
    return x / norms


def _topk_neighbors(emb: np.ndarray, seed_idx: int, k: int) -> np.ndarray:
    sims = emb @ emb[seed_idx]
    sims[seed_idx] = -np.inf
    k = int(min(k, emb.shape[0] - 1))
    idx = np.argpartition(sims, -k)[-k:]
    idx = idx[np.argsort(-sims[idx])]
    return idx.astype(np.int32, copy=False)


def load_titles_for_book_ids(*, books_json_gz: Path, wanted: Set[int]) -> Dict[int, str]:
    out: Dict[int, str] = {}
    for obj in _iter_jsonl_gz(books_json_gz):
        try:
            bid = int(obj.get("book_id"))
        except Exception:
            continue
        if bid not in wanted:
            continue
        title = (obj.get("title") or obj.get("title_without_series") or "").strip()
        if title:
            out[bid] = title
        if len(out) >= len(wanted):
            break
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Qualitative neighbor regression suite (work-level).")
    ap.add_argument("--artifacts", required=True, help="Matrix artifacts dir (contains als_work_factors.npy)")
    ap.add_argument("--mapping", required=True, help="Mapping dir (contains work_to_representative_book.json)")
    ap.add_argument("--seed_work_ids", default="", help="Comma-separated seed work_ids")
    ap.add_argument("--topn", type=int, default=10)
    ap.add_argument(
        "--books",
        default="../data/goodreads_books.json.gz",
        help="Path to goodreads_books.json.gz (for titles; optional but recommended).",
    )
    args = ap.parse_args()

    artifacts = Path(args.artifacts)
    mapping_dir = Path(args.mapping)

    work_ids = np.asarray(read_json(artifacts / "index_to_work_id.json"), dtype=np.int64)
    factors = np.load(str(artifacts / "als_work_factors.npy")).astype(np.float32, copy=False)
    factors = _l2_normalize_rows(factors)
    rep = {int(k): int(v) for k, v in read_json(mapping_dir / "work_to_representative_book.json").items()}

    seeds = _parse_int_list(str(args.seed_work_ids))
    if not seeds:
        raise SystemExit("Provide --seed_work_ids (comma-separated work_ids).")

    where = {int(w): i for i, w in enumerate(work_ids.tolist())}
    seed_idx = []
    for wid in seeds:
        if wid not in where:
            print(f"[WARN] seed work_id={wid} not present in artifacts; skipping")
            continue
        seed_idx.append((wid, where[wid]))
    if not seed_idx:
        raise SystemExit("No seeds present in artifacts.")

    # Load titles for representative books (seeds + neighbors)
    wanted_books: Set[int] = set()
    for wid, _i in seed_idx:
        rb = rep.get(int(wid))
        if rb:
            wanted_books.add(int(rb))

    # Precompute neighbors first so we know which book titles to fetch.
    neigh_by_seed: Dict[int, List[int]] = {}
    for wid, i in seed_idx:
        nn_idx = _topk_neighbors(factors, seed_idx=i, k=int(args.topn))
        nn_wids = [int(work_ids[j]) for j in nn_idx.tolist()]
        neigh_by_seed[int(wid)] = nn_wids
        for nw in nn_wids:
            rb = rep.get(int(nw))
            if rb:
                wanted_books.add(int(rb))

    titles: Dict[int, str] = {}
    books_path = Path(resolve_path_maybe_from_git_root(args.books))
    if books_path.exists() and wanted_books:
        titles = load_titles_for_book_ids(books_json_gz=books_path, wanted=wanted_books)

    for wid, i in seed_idx:
        rb = rep.get(int(wid))
        seed_title = titles.get(int(rb), "") if rb else ""
        print(f"\nSeed work_id={wid} rep_book_id={rb} {seed_title}")
        for r, nw in enumerate(neigh_by_seed[int(wid)], start=1):
            rb2 = rep.get(int(nw))
            title2 = titles.get(int(rb2), "") if rb2 else ""
            print(f"  {r:02d}. work_id={nw} rep_book_id={rb2} {title2}")


if __name__ == "__main__":
    main()

