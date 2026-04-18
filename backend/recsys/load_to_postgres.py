#!/usr/bin/env python3
"""
Load work metadata and genre-enhanced embeddings to recsys Postgres.
Requires: artifacts/work_metadata.json, artifacts/item_embeddings.npz, artifacts/item_embeddings_config.json.
Exports only works present in both. Exported fields: work_id, title, title_without_series, author, isbn10, isbn13, language, cover_url, genres, embedding.
Adds genre dimensions to embeddings (see recsys_book_data.enhance_embedding).
genres field: array of genre names with weight > 0.1.
Base embedding dimension is read from item_embeddings_config.json (key "factors"), fallback 32.
"""
import os
import sys

_RECSYS_DIR = os.path.dirname(os.path.abspath(__file__))
if _RECSYS_DIR not in sys.path:
    sys.path.insert(0, _RECSYS_DIR)

from recsys_book_data import (
    CONFIG_PATH,
    EMBEDDINGS_PATH,
    METADATA_PATH,
    build_work_rows,
)


def main():
    try:
        import psycopg
    except ImportError:
        print("Error: psycopg not installed. pip install 'psycopg[binary]>=3'", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(METADATA_PATH):
        print("Error: work_metadata.json not found. Run build_work_metadata.py first.", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(EMBEDDINGS_PATH):
        print("Error: item_embeddings.npz not found. Run build_item_embeddings.py first.", file=sys.stderr)
        sys.exit(1)

    print("Building rows from artifacts...", flush=True)
    rows, emb_dim = build_work_rows(METADATA_PATH, EMBEDDINGS_PATH, CONFIG_PATH)
    print(f"  {len(rows)} works (embedding dim={emb_dim})", flush=True)

    host = os.environ.get("RECSYS_DB_HOST", "localhost")
    port = int(os.environ.get("RECSYS_DB_PORT", "5433"))
    dbname = os.environ.get("RECSYS_DB_NAME", "recsys")
    user = os.environ.get("RECSYS_DB_USER", "postgres")
    password = os.environ.get("RECSYS_DB_PASSWORD", "postgres")
    db_url = os.environ.get(
        "RECSYS_DB_URL",
        f"postgresql://{user}:{password}@{host}:{port}/{dbname}",
    )

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
                    INSERT INTO works (work_id, title, title_without_series, author, isbn10, isbn13, language, cover_url, genres, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        r["work_id"],
                        r["title"],
                        r["title_without_series"],
                        r["author"],
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
