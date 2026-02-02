from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
from tqdm import tqdm

from .io_utils import read_json, resolve_path_maybe_from_git_root, write_json


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


def _extract_author_names(obj: dict) -> List[str]:
    out: List[str] = []
    a = obj.get("authors")
    if isinstance(a, list):
        for it in a:
            if isinstance(it, dict):
                name = (it.get("name") or it.get("author_name") or "").strip()
                if name:
                    out.append(name)
            elif isinstance(it, str):
                s = it.strip()
                if s:
                    out.append(s)
    elif isinstance(a, str):
        s = a.strip()
        if s:
            out.append(s)
    return out


def _extract_shelves(obj: dict, *, max_shelves: int = 30) -> List[str]:
    out: List[str] = []
    shelves = obj.get("popular_shelves")
    if isinstance(shelves, list):
        for it in shelves[: int(max_shelves)]:
            if not isinstance(it, dict):
                continue
            name = (it.get("name") or "").strip()
            if name:
                out.append(name)
    return out


def build_work_texts(
    *,
    books_json_gz: Path,
    work_ids_in_model: np.ndarray,
    work_to_rep_book: Dict[int, int],
    max_desc_chars: int,
) -> Dict[int, str]:
    """
    Returns {work_id -> text} for works in the model, using the representative book's metadata.
    """
    wanted = set(int(x) for x in work_ids_in_model.tolist())

    out: Dict[int, str] = {}
    for obj in tqdm(_iter_jsonl_gz(books_json_gz), desc="Streaming books metadata for content vectors"):
        try:
            bid = int(obj.get("book_id"))
            wid = int(obj.get("work_id"))
        except Exception:
            continue
        if wid not in wanted:
            continue
        # only build text from representative book (keeps one record per work)
        if int(work_to_rep_book.get(wid, -1)) != bid:
            continue

        title = (obj.get("title") or obj.get("title_without_series") or "").strip()
        authors = _extract_author_names(obj)
        shelves = _extract_shelves(obj)
        lang = (obj.get("language_code") or "").strip()
        fmt = (obj.get("format") or "").strip()
        desc = (obj.get("description") or "").strip()
        if int(max_desc_chars) > 0 and len(desc) > int(max_desc_chars):
            desc = desc[: int(max_desc_chars)]

        parts: List[str] = []
        if title:
            parts.append(title)
        if authors:
            parts.append(" ".join(f"author_{a.replace(' ', '_')}" for a in authors[:10]))
        if shelves:
            parts.append(" ".join(f"shelf_{s.replace(' ', '_')}" for s in shelves))
        if lang:
            parts.append(f"lang_{lang}")
        if fmt:
            parts.append(f"format_{fmt.replace(' ', '_')}")
        if desc:
            parts.append(desc)

        text = "\n".join(parts).strip()
        if text:
            out[wid] = text

        if len(out) >= len(wanted):
            break

    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Build work-level content vectors from Goodreads metadata.")
    ap.add_argument("--artifacts", required=True, help="Matrix artifacts dir (contains index_to_work_id.json)")
    ap.add_argument(
        "--mapping",
        required=True,
        help="Mapping artifacts dir (contains work_to_representative_book.json)",
    )
    ap.add_argument(
        "--books",
        default="../data/goodreads_books.json.gz",
        help="Path to goodreads_books.json.gz (default: ../data/goodreads_books.json.gz)",
    )
    ap.add_argument("--dim", type=int, default=128, help="Output content vector dimension")
    ap.add_argument("--max_features", type=int, default=20000)
    ap.add_argument("--max_desc_chars", type=int, default=2000)
    args = ap.parse_args()

    artifacts = Path(args.artifacts)
    mapping_dir = Path(args.mapping)
    books_path = Path(resolve_path_maybe_from_git_root(args.books))

    work_ids = np.asarray(read_json(artifacts / "index_to_work_id.json"), dtype=np.int64)
    rep = read_json(mapping_dir / "work_to_representative_book.json")
    work_to_rep_book = {int(k): int(v) for k, v in rep.items()}

    texts_by_work = build_work_texts(
        books_json_gz=books_path,
        work_ids_in_model=work_ids,
        work_to_rep_book=work_to_rep_book,
        max_desc_chars=int(args.max_desc_chars),
    )

    # Align texts to model order
    docs: List[str] = []
    missing = 0
    for wid in work_ids.tolist():
        t = texts_by_work.get(int(wid))
        if not t:
            docs.append("")
            missing += 1
        else:
            docs.append(t)

    from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
    from sklearn.decomposition import TruncatedSVD  # type: ignore

    vec = TfidfVectorizer(
        max_features=int(args.max_features),
        ngram_range=(1, 2),
        min_df=2,
        stop_words="english",
    )
    X = vec.fit_transform(docs)  # [num_works, vocab]

    dim = int(args.dim)
    dim = int(min(dim, max(2, X.shape[1] - 1))) if X.shape[1] > 0 else dim
    svd = TruncatedSVD(n_components=int(dim), random_state=42)
    Z = svd.fit_transform(X).astype(np.float32, copy=False)

    # L2 normalize rows (cosine-compatible)
    norms = np.linalg.norm(Z, axis=1, keepdims=True)
    norms = np.clip(norms, 1e-12, None)
    Z = (Z / norms).astype(np.float32, copy=False)

    np.save(str(artifacts / "work_content_vectors.npy"), Z)
    write_json(
        artifacts / "content_report.json",
        {
            "dim": int(Z.shape[1]),
            "max_features": int(args.max_features),
            "missing_texts": int(missing),
            "vocab_size": int(X.shape[1]),
            "explained_variance_ratio_sum": float(np.sum(svd.explained_variance_ratio_)),
        },
    )
    print(f"[OK] wrote: {artifacts/'work_content_vectors.npy'}", flush=True)


if __name__ == "__main__":
    main()

