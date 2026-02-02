from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from typing import Dict, Iterable, Tuple

import numpy as np
from tqdm import tqdm

from .io_utils import ensure_dir, resolve_path_maybe_from_git_root, save_npz, write_json


def _loads(b: bytes) -> dict:
    # Fast path if user has orjson installed in their venv; otherwise stdlib json.
    try:
        import orjson  # type: ignore

        return orjson.loads(b)
    except Exception:
        return json.loads(b.decode("utf-8"))


def _iter_jsonl_gz(path: Path, *, max_lines: int = 0) -> Iterable[dict]:
    with gzip.open(path, "rb") as f:
        for i, line in enumerate(f, start=1):
            if int(max_lines) > 0 and i > int(max_lines):
                break
            line = line.strip()
            if not line:
                continue
            yield _loads(line)


def build_book_to_work_mapping(
    *, books_json_gz: Path, max_lines: int = 0
) -> Tuple[np.ndarray, np.ndarray, Dict[int, int]]:
    """
    Returns:
      - book_ids_sorted[int64]
      - work_ids_sorted[int64] aligned to book_ids_sorted
      - work_to_rep_book_id (pick highest ratings_count, tie lowest book_id)
    """
    book_ids: list[int] = []
    work_ids: list[int] = []

    # For representative selection
    rep_book: Dict[int, int] = {}
    rep_score: Dict[int, int] = {}

    for obj in tqdm(
        _iter_jsonl_gz(books_json_gz, max_lines=int(max_lines)),
        desc="Building book_id->work_id from books",
    ):
        try:
            bid = int(obj.get("book_id"))
            wid = int(obj.get("work_id"))
        except Exception:
            continue

        book_ids.append(bid)
        work_ids.append(wid)

        # Representative: prefer book with larger ratings_count (proxy for canonical edition),
        # tie-breaker: smaller book_id for determinism.
        try:
            rc = int(obj.get("ratings_count") or 0)
        except Exception:
            rc = 0

        prev = rep_score.get(wid)
        if prev is None or rc > prev or (rc == prev and bid < rep_book.get(wid, 1 << 62)):
            rep_score[wid] = rc
            rep_book[wid] = bid

    if not book_ids:
        raise RuntimeError(f"No (book_id, work_id) pairs found in {books_json_gz}")

    b = np.asarray(book_ids, dtype=np.int64)
    w = np.asarray(work_ids, dtype=np.int64)
    order = np.argsort(b)
    b = b[order]
    w = w[order]

    # De-duplicate if the books file contains repeated book_ids (keep the first after sorting).
    # (In practice this should be unique, but we guard anyway.)
    uniq_mask = np.ones(b.shape[0], dtype=bool)
    uniq_mask[1:] = b[1:] != b[:-1]
    b = b[uniq_mask]
    w = w[uniq_mask]

    return b, w, rep_book


def build_work_metadata_from_works(*, works_json_gz: Path, max_lines: int = 0) -> Dict[int, dict]:
    """
    Extract a small subset of work-level metadata to aid debugging/inspection.
    This file doesn't include a book list; it primarily contains work properties
    like best_book_id and publication stats.
    """
    out: Dict[int, dict] = {}
    for obj in tqdm(
        _iter_jsonl_gz(works_json_gz, max_lines=int(max_lines)),
        desc="Reading work metadata",
    ):
        try:
            wid = int(obj.get("work_id"))
        except Exception:
            continue
        best_book_id = obj.get("best_book_id")
        try:
            best_book_id = int(best_book_id) if best_book_id is not None else None
        except Exception:
            best_book_id = None
        out[wid] = {
            "best_book_id": best_book_id,
            "ratings_count": _safe_int(obj.get("ratings_count")),
            "reviews_count": _safe_int(obj.get("reviews_count")),
            "books_count": _safe_int(obj.get("books_count")),
            "original_publication_year": _safe_int(obj.get("original_publication_year")),
            "original_title": (obj.get("original_title") or "").strip(),
        }
    return out


def _safe_int(v) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except Exception:
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description="Build book_id->work_id mapping and representative book_id.")
    ap.add_argument(
        "--books",
        default="../data/goodreads_books.json.gz",
        help="Path to goodreads_books.json.gz (default: ../data/goodreads_books.json.gz)",
    )
    ap.add_argument(
        "--works",
        default="../data/goodreads_book_works.json.gz",
        help="Optional path to goodreads_book_works.json.gz (default: ../data/goodreads_book_works.json.gz)",
    )
    ap.add_argument("--out", required=True, help="Artifacts output directory")
    ap.add_argument(
        "--skip_work_metadata",
        action="store_true",
        help="If set, do not build work_metadata.json (faster).",
    )
    ap.add_argument(
        "--max_lines",
        type=int,
        default=0,
        help="For smoke tests only: stop after N JSON lines (0=all).",
    )
    args = ap.parse_args()

    out_dir = ensure_dir(args.out)
    books_path = resolve_path_maybe_from_git_root(args.books)
    works_path = resolve_path_maybe_from_git_root(args.works)

    book_ids_sorted, work_ids_sorted, work_to_rep_book = build_book_to_work_mapping(
        books_json_gz=Path(books_path),
        max_lines=int(args.max_lines),
    )

    save_npz(out_dir / "book_to_work.npz", book_id=book_ids_sorted, work_id=work_ids_sorted)
    write_json(out_dir / "work_to_representative_book.json", {str(k): int(v) for k, v in work_to_rep_book.items()})

    if not bool(args.skip_work_metadata) and Path(works_path).exists():
        meta = build_work_metadata_from_works(works_json_gz=Path(works_path), max_lines=int(args.max_lines))
        # Only keep metadata for works we actually saw in books mapping (keeps file size bounded).
        keep = set(int(x) for x in np.unique(work_ids_sorted).tolist())
        meta = {str(k): v for k, v in meta.items() if int(k) in keep}
        write_json(out_dir / "work_metadata.json", meta)

    print(f"[OK] wrote: {out_dir/'book_to_work.npz'}", flush=True)
    print(f"[OK] wrote: {out_dir/'work_to_representative_book.json'}", flush=True)


if __name__ == "__main__":
    main()

