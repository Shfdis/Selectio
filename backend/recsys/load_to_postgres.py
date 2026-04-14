#!/usr/bin/env python3
"""
Load work metadata and genre-enhanced embeddings to recsys Postgres.
Requires: artifacts/work_metadata.json, artifacts/item_embeddings.npz, artifacts/item_embeddings_config.json.
Exports only works present in both. Exported fields: work_id, title, title_without_series, author, title_ru, author_ru, isbn10, isbn13, language, cover_url, genres, embedding.
Adds genre dimensions to embeddings:
  extended[base_dim + genre_idx] += 0.2 * norm(base) * genre_weight.
genres field: array of genre names with weight > 0.2.
Base embedding dimension is read from item_embeddings_config.json (key "factors"), fallback 32.
"""
import json
import os
import sys

import numpy as np

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
METADATA_PATH = os.path.join(ARTIFACTS_DIR, "work_metadata.json")
EMBEDDINGS_PATH = os.path.join(ARTIFACTS_DIR, "item_embeddings.npz")
CONFIG_PATH = os.path.join(ARTIFACTS_DIR, "item_embeddings_config.json")
DEFAULT_BASE_EMBEDDING_DIM = 32


def load_metadata(path: str) -> dict:
    """Load work_id -> {title, title_without_series, author, isbn10, isbn13, language, genre, cover_url}."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: {path} is invalid or truncated ({e}).", file=sys.stderr)
        print("Re-run build_work_metadata.py to regenerate, or restore from backup.", file=sys.stderr)
        sys.exit(1)


def load_embeddings(path: str) -> tuple[list, np.ndarray]:
    """Load work_id array and embedding matrix from npz. Return (work_ids, embeddings)."""
    data = np.load(path, allow_pickle=True)
    work_ids = data["work_id"].tolist()
    embeddings = np.asarray(data["embedding"], dtype=np.float32)
    return work_ids, embeddings


def build_genre_index(metadata: dict, work_ids: set) -> tuple[dict, int]:
    """Collect unique genres from metadata for given work_ids. Return (genre_name -> index, N)."""
    genres = set()
    for wid in work_ids:
        m = metadata.get(wid)
        if not m:
            continue
        g = m.get("genre")
        if g and isinstance(g, dict):
            genres.update(g.keys())
    genre_list = sorted(genres)
    return {g: i for i, g in enumerate(genre_list)}, len(genre_list)


def get_base_embedding_dim() -> int:
    """Read base embedding dimension from item_embeddings_config.json (key 'factors'), fallback DEFAULT_BASE_EMBEDDING_DIM."""
    if not os.path.isfile(CONFIG_PATH):
        return DEFAULT_BASE_EMBEDDING_DIM
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)
    return int(config.get("factors", DEFAULT_BASE_EMBEDDING_DIM))


def enhance_embedding(
    base: np.ndarray,
    genre_weights: dict | None,
    genre_to_idx: dict,
    base_dim: int,
) -> np.ndarray:
    """Extend base (base_dim) with genre dimensions: 0.2 * norm * weight per genre."""
    n_genres = len(genre_to_idx)
    extended = np.zeros(base_dim + n_genres, dtype=np.float32)
    extended[:base_dim] = base
    if genre_weights and genre_to_idx:
        norm = float(np.linalg.norm(base))
        scale = 0.5 * norm
        for g, w in genre_weights.items():
            if g in genre_to_idx:
                extended[base_dim + genre_to_idx[g]] = scale * w
    return extended


def genres_array(genre_weights: dict | None, threshold: float = 0.1) -> list[str]:
    """Return genre names with weight > threshold."""
    if not genre_weights:
        return []
    return [g for g, w in genre_weights.items() if w > threshold]


def main():
    if not os.path.isfile(METADATA_PATH):
        print("Error: work_metadata.json not found. Run build_work_metadata.py first.", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(EMBEDDINGS_PATH):
        print("Error: item_embeddings.npz not found. Run build_item_embeddings.py first.", file=sys.stderr)
        sys.exit(1)

    print("Loading metadata...", flush=True)
    metadata = load_metadata(METADATA_PATH)
    print(f"  {len(metadata)} works", flush=True)

    print("Loading embeddings...", flush=True)
    embed_work_ids, embeddings = load_embeddings(EMBEDDINGS_PATH)
    embed_by_work = {str(wid): embeddings[i] for i, wid in enumerate(embed_work_ids)}
    print(f"  {len(embed_by_work)} works", flush=True)

    work_ids = set(embed_by_work.keys()) & set(metadata.keys())
    print(f"Intersection: {len(work_ids)} works to export", flush=True)

    genre_to_idx, n_genres = build_genre_index(metadata, work_ids)
    print(f"Unique genres: {n_genres}", flush=True)

    base_dim = get_base_embedding_dim()
    emb_dim = base_dim + n_genres
    rows = []
    for wid in sorted(work_ids):
        m = metadata[wid]
        base = embed_by_work[wid]
        genre_weights = m.get("genre") if isinstance(m.get("genre"), dict) else None
        ext = enhance_embedding(base, genre_weights, genre_to_idx, base_dim)
        norm = float(np.linalg.norm(ext))
        if norm > 0:
            ext = (ext / norm).astype(np.float32)
        garr = genres_array(genre_weights)
        rows.append({
            "work_id": wid,
            "title": m.get("title"),
            "title_without_series": m.get("title_without_series"),
            "author": m.get("author"),
            "title_ru": m.get("title_ru"),
            "author_ru": m.get("author_ru"),
            "isbn10": m.get("isbn10"),
            "isbn13": m.get("isbn13"),
            "language": m.get("language"),
            "cover_url": m.get("cover_url"),
            "genres": garr,
            "embedding": ext,
        })

    host = os.environ.get("RECSYS_DB_HOST", "localhost")
    port = int(os.environ.get("RECSYS_DB_PORT", "5433"))
    dbname = os.environ.get("RECSYS_DB_NAME", "recsys")
    user = os.environ.get("RECSYS_DB_USER", "postgres")
    password = os.environ.get("RECSYS_DB_PASSWORD", "postgres")
    db_url = os.environ.get(
        "RECSYS_DB_URL",
        f"postgresql://{user}:{password}@{host}:{port}/{dbname}",
    )

    try:
        import psycopg
    except ImportError:
        print("Error: psycopg not installed. pip install 'psycopg[binary]>=3'", file=sys.stderr)
        sys.exit(1)

    print("Connecting to Postgres...", flush=True)
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.commit()

            cur.execute("DROP TABLE IF EXISTS works;")
            conn.commit()

            cur.execute(
                f"""
                CREATE TABLE works (
                  work_id TEXT PRIMARY KEY,
                  title TEXT,
                  title_without_series TEXT,
                  author TEXT,
                  title_ru TEXT,
                  author_ru TEXT,
                  isbn10 TEXT,
                  isbn13 TEXT,
                  language TEXT,
                  cover_url TEXT,
                  genres TEXT[],
                  embedding vector({emb_dim})
                );
                """
            )
            conn.commit()

            cur.execute(
                "CREATE INDEX ON works USING hnsw (embedding vector_cosine_ops);"
            )
            conn.commit()

        print("Inserting rows...", flush=True)
        with conn.cursor() as cur:
            for r in rows:
                emb_str = "[" + ",".join(str(x) for x in r["embedding"].tolist()) + "]"
                cur.execute(
                    """
                    INSERT INTO works (work_id, title, title_without_series, author, title_ru, author_ru, isbn10, isbn13, language, cover_url, genres, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        r["work_id"],
                        r["title"],
                        r["title_without_series"],
                        r["author"],
                        r["title_ru"],
                        r["author_ru"],
                        r["isbn10"],
                        r["isbn13"],
                        r["language"],
                        r["cover_url"],
                        r["genres"],
                        emb_str,
                    ),
                )
        conn.commit()

    print(f"Loaded {len(rows)} works to Postgres (embedding dim={emb_dim})", flush=True)


if __name__ == "__main__":
    main()
