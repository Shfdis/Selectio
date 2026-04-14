#!/usr/bin/env python3
"""
Enrich work_metadata.json with Russian title and author (title_ru, author_ru).

Fills title_ru and author_ru by:
  1. Looking up Russian editions in Open Library (by ISBN, then by title+author search).
  2. If not found, translating title and author via a configurable translation API (default: LibreTranslate).

Only values that pass Cyrillic verification are stored. Processing order: most popular works first
(by popularity in work_metadata or interaction count from goodreads_interactions.csv). Only the top
TOP_ENRICH_WORKS (default 10000) by popularity are enriched; items and embeddings are built for all books.

Requirements:
  - artifacts/work_metadata.json (from build_work_metadata.py)
  - For popularity order: data/goodreads_interactions.csv, data/book_id_map.csv, data/goodreads_books.json.gz
  - If interactions are missing, all works in metadata are processed in work_id order.

Environment:
  - LIBRETRANSLATE_URL: base URL for LibreTranslate (default https://libretranslate.com)
  - LIBRETRANSLATE_API_KEY: optional API key
  - LIBRETRANSLATE_DELAY: seconds between API calls (default 5). Increase if you still get 429.
  - TRANSLATION_API: "libre" (default) or "none" to skip translation fallback
  - TRANSLATION_ONLY: "1" (default) = plain translation only; "0" = try Open Library first then translation

After running, re-run load_to_postgres.py to export title_ru and author_ru to Postgres.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
METADATA_PATH = os.path.join(ARTIFACTS_DIR, "work_metadata.json")
CHUNK_SIZE = 2_000_000


def _atomic_write_json(path: str, data: dict) -> None:
    """Write JSON to a temp file then rename; avoids truncated file on kill/crash."""
    fd, tmp = os.path.split(path)
    tmp = os.path.join(fd, f".{tmp}.tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=0)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass
TOP_ENRICH_WORKS = 10_000  # Enrich (title_ru, author_ru) only for top N by popularity
OPEN_LIBRARY_DELAY = 1.5  # seconds between requests
# Delay between translation API calls; set LIBRETRANSLATE_DELAY in env to override. Default 5s for public API.
def _translation_delay() -> float:
    try:
        return max(0.0, float(os.environ.get("LIBRETRANSLATE_DELAY", "5.0")))
    except ValueError:
        return 5.0
SAVE_EVERY = 100  # write metadata to disk every N works (not every work)
USER_AGENT = "SelectioRecsys/1.0 (metadata enrichment)"
TRANSLATION_429_WAIT = 120  # base seconds to wait on 429; backoff doubles each retry
TRANSLATION_429_MAX_RETRIES = 3  # retry this many times on 429 before giving up


def is_cyrillic(text: str | None) -> bool:
    """Return True if text is non-empty and has at least one Cyrillic letter (U+0400--U+04FF)."""
    if not text or not (t := text.strip()):
        return False
    return any("\u0400" <= c <= "\u04FF" for c in t)


def is_mostly_cyrillic(text: str | None) -> bool:
    """Return True if majority of letters (ignoring spaces/punctuation/digits) are Cyrillic."""
    if not text or not (t := text.strip()):
        return False
    letters = [c for c in t if c.isalpha()]
    if not letters:
        return False
    cyrillic_count = sum(1 for c in letters if "\u0400" <= c <= "\u04FF")
    return cyrillic_count > len(letters) / 2


def _get_json(url: str) -> dict | list | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def _open_library_edition_by_isbn(isbn: str) -> dict | None:
    """Fetch Open Library edition by ISBN. Returns edition dict or None."""
    url = f"https://openlibrary.org/isbn/{urllib.parse.quote(isbn)}.json"
    return _get_json(url)


def _edition_has_russian(edition: dict) -> bool:
    langs = edition.get("languages") or []
    for lang in langs:
        if isinstance(lang, dict) and lang.get("key") == "/languages/rus":
            return True
        if isinstance(lang, str) and "rus" in lang.lower():
            return True
    return False


def _edition_title(edition: dict) -> str | None:
    t = edition.get("title")
    return (t.strip() if isinstance(t, str) and t.strip() else None) or None


def _edition_authors(edition: dict) -> list[str]:
    """Resolve author names from edition 'authors' (list of keys). Fetches author pages if needed."""
    authors_raw = edition.get("authors") or []
    names = []
    for a in authors_raw:
        key = a.get("key") if isinstance(a, dict) else (a if isinstance(a, str) else None)
        if not key:
            continue
        if isinstance(key, str) and key.startswith("/authors/"):
            author_url = f"https://openlibrary.org{key}.json"
            author_data = _get_json(author_url)
            if author_data and isinstance(author_data, dict):
                name = author_data.get("name")
                if name and isinstance(name, str):
                    names.append(name.strip())
            time.sleep(OPEN_LIBRARY_DELAY)
    return names


def _open_library_search_russian(title: str, author: str | None) -> tuple[str | None, str | None]:
    """Search Open Library for Russian edition by title/author. Returns (title_ru, author_ru) or (None, None)."""
    q_parts = [title]
    if author:
        q_parts.append(author)
    q = " ".join(q_parts).strip()
    if not q:
        return None, None
    query = urllib.parse.quote(q)
    url = f"https://openlibrary.org/search.json?q={query}&language=rus&limit=5"
    data = _get_json(url)
    if not data or not isinstance(data, dict):
        return None, None
    docs = data.get("docs") or []
    for doc in docs:
        title_ru = doc.get("title")
        author_names = doc.get("author_name")
        if isinstance(title_ru, str) and title_ru.strip():
            author_ru = None
            if isinstance(author_names, list) and author_names:
                author_ru = " ".join(str(a).strip() for a in author_names if a).strip() or None
            if is_mostly_cyrillic(title_ru) and (author_ru is None or is_mostly_cyrillic(author_ru)):
                return title_ru.strip(), (author_ru.strip() if author_ru else None)
    return None, None


def _translate_libre(text: str, source: str = "en", target: str = "ru", _log_failure: list | None = None, _429_retries: int = 0) -> str | None:
    """Translate text using LibreTranslate API. Returns translated string or None. Retries on 429 with backoff."""
    base = os.environ.get("LIBRETRANSLATE_URL", "https://libretranslate.com").rstrip("/")
    url = f"{base}/translate"
    payload = {"q": text, "source": source, "target": target}
    api_key = os.environ.get("LIBRETRANSLATE_API_KEY")
    if api_key:
        payload["api_key"] = api_key
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            out = json.loads(resp.read().decode("utf-8"))
            if isinstance(out, dict) and "translatedText" in out:
                return out["translatedText"].strip() or None
            if _log_failure is not None and not _log_failure:
                _log_failure.append(1)
                print("  Warning: LibreTranslate returned no translatedText.", file=sys.stderr, flush=True)
            return None
    except urllib.error.HTTPError as e:
        if e.code == 429 and _429_retries < TRANSLATION_429_MAX_RETRIES:
            wait = TRANSLATION_429_WAIT * (2 **_429_retries)
            retry_after = e.headers.get("Retry-After")
            if retry_after:
                try:
                    wait = min(int(retry_after), 600)
                except ValueError:
                    pass
            print(f"  Rate limited (429). Waiting {wait}s then retry {_429_retries + 1}/{TRANSLATION_429_MAX_RETRIES}...", file=sys.stderr, flush=True)
            time.sleep(wait)
            return _translate_libre(text, source, target, _log_failure, _429_retries=_429_retries + 1)
        if _log_failure is not None and not _log_failure:
            _log_failure.append(1)
            print(f"  Warning: LibreTranslate request failed: {e}", file=sys.stderr, flush=True)
        return None
    except Exception as e:
        if _log_failure is not None and not _log_failure:
            _log_failure.append(1)
            print(f"  Warning: LibreTranslate request failed: {e}", file=sys.stderr, flush=True)
        return None


def fetch_russian_by_isbn(metadata: dict, work_id: str) -> tuple[str | None, str | None]:
    """Try to get Russian title and author from Open Library by ISBN. Returns (title_ru, author_ru)."""
    m = metadata.get(work_id) or {}
    isbn13 = (m.get("isbn13") or "").strip() or None
    isbn10 = (m.get("isbn10") or "").strip() or None
    for isbn in (isbn13, isbn10):
        if not isbn:
            continue
        edition = _open_library_edition_by_isbn(isbn)
        time.sleep(OPEN_LIBRARY_DELAY)
        if not edition or not isinstance(edition, dict):
            continue
        if not _edition_has_russian(edition):
            continue
        title_ru = _edition_title(edition)
        authors = _edition_authors(edition)
        author_ru = " ".join(authors).strip() or None
        if title_ru and is_mostly_cyrillic(title_ru) and (not author_ru or is_mostly_cyrillic(author_ru)):
            return title_ru, (author_ru or None)
    return None, None


def fetch_russian_by_search(metadata: dict, work_id: str) -> tuple[str | None, str | None]:
    """Try to get Russian title and author from Open Library search. Returns (title_ru, author_ru)."""
    m = metadata.get(work_id) or {}
    title = (m.get("title_without_series") or m.get("title") or "").strip()
    author = (m.get("author") or "").strip() or None
    return _open_library_search_russian(title, author)


def translate_fallback(metadata: dict, work_id: str, log_failures: list | None = None) -> tuple[str | None, str | None]:
    """Translate title and author to Russian via LibreTranslate. Returns (title_ru, author_ru)."""
    m = metadata.get(work_id) or {}
    title_src = (m.get("title_without_series") or m.get("title") or "").strip()
    author_src = (m.get("author") or "").strip() or None
    if not title_src:
        return None, None
    title_ru = _translate_libre(title_src, "en", "ru", log_failures)
    delay = _translation_delay()
    if delay > 0 and (title_ru is not None or author_src):
        time.sleep(delay)
    author_ru = _translate_libre(author_src, "en", "ru", log_failures) if author_src else None
    return title_ru, author_ru


def compute_work_popularity() -> dict[str, int]:
    """Compute work_id -> interaction count from Goodreads data. Returns dict; empty if data missing."""
    interactions_path = os.path.join(DATA_DIR, "goodreads_interactions.csv")
    book_map_path = os.path.join(DATA_DIR, "book_id_map.csv")
    books_path = os.path.join(DATA_DIR, "goodreads_books.json.gz")
    if not os.path.isfile(interactions_path) or not os.path.isfile(book_map_path) or not os.path.isfile(books_path):
        return {}

    book_to_work = {}
    import gzip
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
    work_counts: dict[str, int] = defaultdict(int)
    for chunk in pd.read_csv(interactions_path, chunksize=CHUNK_SIZE):
        chunk["work_id"] = chunk["book_id"].map(book_id_series).map(book_to_work)
        chunk = chunk.dropna(subset=["work_id"])
        chunk["work_id"] = chunk["work_id"].astype(str)
        for w, c in chunk["work_id"].value_counts().items():
            work_counts[w] += c
    return dict(work_counts)


def main():
    if not os.path.isfile(METADATA_PATH):
        print("Error: work_metadata.json not found. Run build_work_metadata.py first.", file=sys.stderr)
        sys.exit(1)

    print("Loading work_metadata.json...", flush=True)
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: {METADATA_PATH} is invalid or truncated ({e}).", file=sys.stderr)
        print("Re-run build_work_metadata.py to regenerate, or restore from backup.", file=sys.stderr)
        sys.exit(1)
    work_ids_all = sorted(metadata.keys())
    print(f"  {len(work_ids_all)} works in metadata", flush=True)

    # Popularity: prefer work_metadata.popularity (set by build_work_metadata.py), else compute from interactions
    work_counts = {w: metadata[w].get("popularity", 0) for w in work_ids_all}
    if not any(work_counts.values()):
        print("Computing work popularity from interactions...", flush=True)
        work_counts = compute_work_popularity()
    if work_counts:
        candidates = [(w, work_counts.get(w, 0)) for w in work_ids_all]
        candidates.sort(key=lambda x: -x[1])
        work_order = [w for w, _ in candidates]
        work_order = work_order[:TOP_ENRICH_WORKS]
        print(f"  Enriching top {len(work_order)} works by popularity (TOP_ENRICH_WORKS={TOP_ENRICH_WORKS})", flush=True)
    else:
        work_order = sorted(work_ids_all)[:TOP_ENRICH_WORKS]
        print(f"  No popularity data; enriching first {len(work_order)} works by work_id", flush=True)

    translation_api = os.environ.get("TRANSLATION_API", "libre").strip().lower()
    # Default: translation only (skip Open Library) so it's fast and actually fills data
    translation_only = os.environ.get("TRANSLATION_ONLY", "1").strip().lower() in ("1", "true", "yes")
    if translation_only:
        print("  Using plain translation only (skip Open Library). Set TRANSLATION_ONLY=0 for Open Library first.", flush=True)
        d = _translation_delay()
        print(f"  LIBRETRANSLATE_DELAY={d}s between requests (set env to avoid 429).", flush=True)
    else:
        print("  Using Open Library then translation fallback (slower).", flush=True)
    translation_failures_log: list[int] = []  # log first API failure only
    sources_log: dict[str, str] = {}
    done = 0
    skipped = 0
    for i, work_id in enumerate(work_order):
        m = metadata[work_id]
        if m.get("title_ru") and m.get("author_ru"):
            skipped += 1
            continue
        title_ru, author_ru = None, None
        source = "none"

        if not translation_only:
            # 1) Open Library by ISBN
            t1, a1 = fetch_russian_by_isbn(metadata, work_id)
            if t1 and is_mostly_cyrillic(t1):
                title_ru = t1
                source = "openlibrary_isbn"
            if a1 and is_mostly_cyrillic(a1):
                author_ru = a1
                if source == "none":
                    source = "openlibrary_isbn"
            if title_ru is None or author_ru is None:
                time.sleep(OPEN_LIBRARY_DELAY)
                # 2) Open Library search
                t2, a2 = fetch_russian_by_search(metadata, work_id)
                time.sleep(OPEN_LIBRARY_DELAY)
                if t2 and is_mostly_cyrillic(t2) and title_ru is None:
                    title_ru = t2
                    source = source or "openlibrary_search"
                if a2 and is_mostly_cyrillic(a2) and author_ru is None:
                    author_ru = a2
                    source = source or "openlibrary_search"

        # 3) Translation for any still missing (or always when TRANSLATION_ONLY)
        if (title_ru is None or author_ru is None) and translation_api == "libre":
            tr_title, tr_author = translate_fallback(metadata, work_id, translation_failures_log)
            if title_ru is None and tr_title and is_mostly_cyrillic(tr_title):
                title_ru = tr_title
                source = source or "translation"
            if author_ru is None and tr_author and is_mostly_cyrillic(tr_author):
                author_ru = tr_author
                source = source or "translation"

        # Only persist values that pass Cyrillic check
        if title_ru and is_mostly_cyrillic(title_ru):
            m["title_ru"] = title_ru
        if author_ru and is_mostly_cyrillic(author_ru):
            m["author_ru"] = author_ru
        if source != "none":
            sources_log[work_id] = source
            done += 1
        # Write to disk only every SAVE_EVERY works to avoid 10k full JSON writes (very slow)
        if (i + 1) % SAVE_EVERY == 0 or (i + 1) == len(work_order):
            _atomic_write_json(METADATA_PATH, metadata)
        if (i + 1) % 50 == 0 or (i + 1) == len(work_order):
            print(f"  Progress: {i + 1}/{len(work_order)} processed, {done} enriched, {skipped} skipped (already had RU)", flush=True)

    _atomic_write_json(METADATA_PATH, metadata)
    print(f"Done. Enriched {done} works. Re-run load_to_postgres.py to export title_ru and author_ru.", flush=True)

    log_path = os.path.join(ARTIFACTS_DIR, "enrich_ru_sources.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(sources_log, f, ensure_ascii=False)
    print(f"Source log written to {log_path}", flush=True)


if __name__ == "__main__":
    main()
