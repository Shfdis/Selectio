#!/usr/bin/env python3
"""
Build artifacts/work_metadata.json from Goodreads dataset.
Output: title, title_without_series, author, isbn10, isbn13, language, genre (dict of genre name -> weight in [0, 1], sum to 1), cover_url for each work (from best_book_id).
"""
import gzip
import json
import os
import re

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
OUT_PATH = os.path.join(os.path.dirname(__file__), "artifacts", "work_metadata.json")
CHUNK_SIZE = 2_000_000


def load_works(path: str) -> dict:
    """Stream goodreads_book_works.json.gz -> work_id -> {best_book_id, original_title}."""
    works = {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            work_id = d.get("work_id")
            if work_id is None:
                continue
            works[str(work_id)] = {
                "best_book_id": d.get("best_book_id", ""),
                "original_title": d.get("original_title") or "",
            }
    return works


def load_books(path: str) -> dict:
    """Stream goodreads_books.json.gz -> book_id -> {title, title_without_series, isbn, isbn13, author_id, language_code}."""
    books = {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            book_id = d.get("book_id")
            if book_id is None:
                continue
            authors = d.get("authors") or []
            author_id = authors[0]["author_id"] if authors else None
            lang = (d.get("language_code") or "").strip()
            cover = (d.get("image_url") or d.get("small_image_url") or "").strip() or None
            title_ws = (d.get("title_without_series") or "").strip() or None
            books[str(book_id)] = {
                "title": d.get("title") or "",
                "title_without_series": title_ws,
                "isbn": (d.get("isbn") or "").strip() or None,
                "isbn13": (d.get("isbn13") or "").strip() or None,
                "author_id": str(author_id) if author_id else None,
                "language_code": lang if lang else None,
                "cover_url": cover,
            }
    return books


def load_authors(path: str) -> dict:
    """Stream goodreads_book_authors.json.gz -> author_id -> name."""
    authors = {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            aid = d.get("author_id")
            if aid is not None:
                authors[str(aid)] = d.get("name") or ""
    return authors


def load_genres(path: str) -> dict:
    """Stream goodreads_book_genres_initial.json.gz -> book_id -> {genre_name: count}."""
    book_id_to_genres = {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            book_id = d.get("book_id")
            if book_id is None:
                continue
            genres = d.get("genres") or {}
            if isinstance(genres, dict):
                book_id_to_genres[str(book_id)] = genres
    return book_id_to_genres


def _trim_trailing_comma(s: str) -> str:
    """Remove trailing comma and surrounding whitespace."""
    return s.rstrip().rstrip(",").strip()


def strip_series_from_title(title: str | None) -> str | None:
    """If title ends with series info (parenthetical; " / ..."; "/N"; ", #N" or " #N"; ", Vol./Volume/Volumen N" or " Vol. N: subtitle"; " Volume#N"; " N [x]"), return title without it; else return None."""
    if not title or not title.strip():
        return None
    t = title.strip()
    # Trailing parenthetical: #N, #N-M, number, or Vol./Volume/Volumen N (e.g. "Series, #1", "Series, Vol. 2", "Volume 3")
    m = re.search(
        r"\s*\([^)]*(?:#\d+(?:-\d+)?|\d+|(?:vol\.?|volume|volumen)\s*\d+)[^)]*\)\s*$",
        t,
        re.IGNORECASE,
    )
    if m:
        stripped = _trim_trailing_comma(t[: m.start()])
        if stripped:
            t = stripped
        else:
            return None
    # Trailing " / Series name" or " / Series name, #1"
    m_slash = re.search(r"\s+/\s+[^/]+$", t)
    if m_slash:
        stripped = _trim_trailing_comma(t[: m_slash.start()])
        if stripped:
            t = stripped
        else:
            return None
    # Trailing "/N" or "/N rest" (e.g. "Gantz/13")
    m_slash_num = re.search(r"/\d+.*$", t)
    if m_slash_num:
        stripped = _trim_trailing_comma(t[: m_slash_num.start()])
        if stripped:
            t = stripped
    # Trailing ", #N" or ", #N-M" (e.g. "Welcome to the NHK, #7")
    m_comma_hash = re.search(r",\s*#\d+(?:-\d+)?\s*$", t)
    if m_comma_hash:
        stripped = _trim_trailing_comma(t[: m_comma_hash.start()])
        if stripped:
            t = stripped
    # Trailing " #N" or " #N-M" (e.g. "Vagabond #17")
    m_space_hash = re.search(r"\s+#\d+(?:-\d+)?\s*$", t)
    if m_space_hash:
        stripped = _trim_trailing_comma(t[: m_space_hash.start()])
        if stripped:
            t = stripped
    # Trailing " Volume#N" or " Volume #N" (e.g. "Vagabond  Volume#12")
    vol_word = r"vol\.?|volume|volumen"
    m_vol_hash = re.search(
        rf"\s+(?:{vol_word})\s*#\d+(?:-\d+)?\s*$",
        t,
        re.IGNORECASE,
    )
    if m_vol_hash:
        stripped = _trim_trailing_comma(t[: m_vol_hash.start()])
        if stripped:
            t = stripped
    # Trailing ", Vol./Volume/Volumen N" or ", Vol. N: subtitle" (subtitle may contain commas; e.g. "D.Gray-Man (3-in-1 Edition), Vol. 1: Includes Vols. 1, 2 & 3 (...)")
    m_vol = re.search(
        rf",\s*(?:{vol_word})\s*\d+\s*(?::\s*.*)?\s*$",
        t,
        re.IGNORECASE,
    )
    if m_vol:
        stripped = _trim_trailing_comma(t[: m_vol.start()])
        if stripped:
            t = stripped
    # Trailing " Vol./Volume/Volumen N: subtitle" (no comma; e.g. "Hoshin Engi Volume 1: Beginnings")
    m_vol_space = re.search(
        rf"\s+(?:{vol_word})\s*\d+\s*(?::\s*.*)?\s*$",
        t,
        re.IGNORECASE,
    )
    if m_vol_space:
        stripped = _trim_trailing_comma(t[: m_vol_space.start()])
        if stripped:
            t = stripped
    # Trailing " N [bracketed]" or " N" at end (e.g. "ワンパンマン 4 [Wanpanman 4]")
    m_num_bracket = re.search(r"\s+\d+\s*(?:\[[^\]]*\])?\s*$", t)
    if m_num_bracket:
        stripped = _trim_trailing_comma(t[: m_num_bracket.start()])
        if stripped:
            t = stripped
    return t if t != title.strip() else None


def build_metadata(works: dict, books: dict, authors: dict, book_id_to_genres: dict) -> dict:
    """Build work_id -> {title, title_without_series, author, isbn10, isbn13, language, genre, cover_url}."""
    out = {}
    for work_id, w in works.items():
        best_book_id = (w.get("best_book_id") or "").strip()
        orig = w.get("original_title") or None
        orig_ws = strip_series_from_title(orig) if orig else None
        if not best_book_id:
            out[work_id] = {
                "title": orig,
                "title_without_series": orig_ws if orig_ws else orig,
                "author": None,
                "isbn10": None,
                "isbn13": None,
                "language": None,
                "genre": None,
                "cover_url": None,
            }
            continue
        book = books.get(best_book_id)
        if book is None:
            out[work_id] = {
                "title": orig,
                "title_without_series": orig_ws if orig_ws else orig,
                "author": None,
                "isbn10": None,
                "isbn13": None,
                "language": None,
                "genre": None,
                "cover_url": None,
            }
            continue
        author_id = book.get("author_id")
        author = authors.get(author_id) if author_id else None
        genres = book_id_to_genres.get(best_book_id)
        if genres and isinstance(genres, dict):
            total = sum(genres.values())
            if total > 0:
                genre_weights = {
                    name: round(count / total, 6) for name, count in genres.items()
                }
            else:
                genre_weights = None
        else:
            genre_weights = None
        title = book.get("title") or None
        title_ws_source = book.get("title_without_series")
        if title_ws_source and title_ws_source != title:
            title_without_series = title_ws_source
        else:
            derived = strip_series_from_title(title)
            title_without_series = derived if derived else title

        out[work_id] = {
            "title": title,
            "title_without_series": title_without_series,
            "author": author if author else None,
            "isbn10": book.get("isbn"),
            "isbn13": book.get("isbn13"),
            "language": book.get("language_code"),
            "genre": genre_weights,
            "cover_url": book.get("cover_url"),
        }
    return out


def compute_work_popularity() -> dict[str, int]:
    """Compute work_id -> interaction count from Goodreads data. Returns dict; empty if data missing."""
    interactions_path = os.path.join(DATA_DIR, "goodreads_interactions.csv")
    book_map_path = os.path.join(DATA_DIR, "book_id_map.csv")
    books_path = os.path.join(DATA_DIR, "goodreads_books.json.gz")
    if not os.path.isfile(interactions_path) or not os.path.isfile(book_map_path) or not os.path.isfile(books_path):
        return {}

    book_to_work = {}
    with gzip.open(books_path, "rt", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                d = json.loads(line)
                bid = d.get("book_id")
                wid = d.get("work_id")
                if bid is not None and wid is not None:
                    book_to_work[str(bid)] = str(wid)
            except Exception:
                continue

    import pandas as pd
    df_map = pd.read_csv(book_map_path, index_col=0)
    book_id_series = df_map["book_id"].astype(str)
    work_counts = {}
    for chunk in pd.read_csv(interactions_path, chunksize=CHUNK_SIZE):
        chunk["work_id"] = chunk["book_id"].map(book_id_series).map(book_to_work)
        chunk = chunk.dropna(subset=["work_id"])
        chunk["work_id"] = chunk["work_id"].astype(str)
        for w, c in chunk["work_id"].value_counts().items():
            work_counts[w] = work_counts.get(w, 0) + c
    return work_counts


def main():
    works_path = os.path.join(DATA_DIR, "goodreads_book_works.json.gz")
    books_path = os.path.join(DATA_DIR, "goodreads_books.json.gz")
    authors_path = os.path.join(DATA_DIR, "goodreads_book_authors.json.gz")
    genres_path = os.path.join(DATA_DIR, "goodreads_book_genres_initial.json.gz")

    print("Loading works...")
    works = load_works(works_path)
    print(f"  {len(works)} works")

    print("Loading books...")
    books = load_books(books_path)
    print(f"  {len(books)} books")

    print("Loading authors...")
    authors = load_authors(authors_path)
    print(f"  {len(authors)} authors")

    print("Loading genres...")
    book_id_to_genres = load_genres(genres_path)
    print(f"  {len(book_id_to_genres)} books with genres")

    print("Building metadata...")
    metadata = build_metadata(works, books, authors, book_id_to_genres)

    print("Adding popularity (interaction counts)...", flush=True)
    work_counts = compute_work_popularity()
    if work_counts:
        for work_id in metadata:
            metadata[work_id]["popularity"] = work_counts.get(work_id, 0)
        print(f"  Set popularity for {len(metadata)} works", flush=True)
    else:
        print("  Interactions data missing; skipping popularity", flush=True)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(metadata)} works to {OUT_PATH}")


if __name__ == "__main__":
    main()
