#!/usr/bin/env python3
"""
Export recsys artifacts to SQL suitable for loading into production crud."Books".

Reads the same artifacts as load_to_postgres.py (via recsys_book_data.build_work_rows).
Validates embedding dimension == 72 (crud EmbeddingService / Book entity).

Outputs (default under recsys/artifacts/):
  - books_prod_preamble.sql  — copy of sql/prod_books_replace_preamble.sql
  - books_prod_inserts.sql   — batched INSERT INTO crud."Books" (...)
  - books_prod_postamble.sql — copy of sql/prod_books_replace_postamble.sql

Usage:
  cd backend/recsys && python export_books_for_prod.py
  python export_books_for_prod.py --out-dir /tmp/books_export

Optional: override expected embedding dim (not recommended):
  export EXPECTED_EMBEDDING_DIM=72
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys

_RECSYS_DIR = os.path.dirname(os.path.abspath(__file__))
if _RECSYS_DIR not in sys.path:
    sys.path.insert(0, _RECSYS_DIR)

from recsys_book_data import (  # noqa: E402
    CONFIG_PATH,
    EMBEDDINGS_PATH,
    METADATA_PATH,
    PROD_BOOK_EMBEDDING_DIM,
    build_work_rows,
    row_to_crud_book_fields,
)


def _sql_escape_literal(s: str) -> str:
    """Escape a string for single-quoted SQL literal."""
    return s.replace("'", "''")


def _real_array_sql(values: list[float]) -> str:
    """Format Python floats as PostgreSQL real[] literal."""
    parts = [str(float(x)) for x in values]
    return "ARRAY[" + ",".join(parts) + "]::real[]"


def _copy_sql_template(src_name: str, dest_path: str) -> None:
    src = os.path.join(_RECSYS_DIR, "sql", src_name)
    if not os.path.isfile(src):
        raise FileNotFoundError(f"Missing SQL template: {src}")
    shutil.copyfile(src, dest_path)


def _write_inserts(path: str, rows: list[dict], batch_size: int = 200) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write("-- Batched INSERTs (Id is generated)\n")
        batch: list[dict] = []
        for r in rows:
            batch.append(row_to_crud_book_fields(r))
            if len(batch) >= batch_size:
                _flush_insert_batch(f, batch)
                batch = []
        if batch:
            _flush_insert_batch(f, batch)


def _flush_insert_batch(f, batch: list[dict]) -> None:
    values_sql = []
    for b in batch:
        title = _sql_escape_literal(b["Title"])
        author = _sql_escape_literal(b["Author"])
        desc = _sql_escape_literal(b["Description"])
        genre = _sql_escape_literal(b["Genre"])
        cover = _sql_escape_literal(b["CoverUrl"])
        emb = _real_array_sql(b["Embedding"])
        values_sql.append(
            f"('{title}', '{author}', '{desc}', '{genre}', '{cover}', NULL, {emb})"
        )
    f.write(
        'INSERT INTO crud."Books" ("Title", "Author", "Description", "Genre", "CoverUrl", "ReleaseDate", "Embedding") VALUES\n'
    )
    f.write(",\n".join(values_sql))
    f.write(";\n\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export recsys books to production SQL")
    parser.add_argument(
        "--out-dir",
        default=os.path.join(_RECSYS_DIR, "artifacts"),
        help="Directory for generated SQL files",
    )
    parser.add_argument("--batch-size", type=int, default=200, help="Rows per INSERT statement")
    args = parser.parse_args()

    expected_dim = int(os.environ.get("EXPECTED_EMBEDDING_DIM", str(PROD_BOOK_EMBEDDING_DIM)))

    if not os.path.isfile(METADATA_PATH):
        print(f"Error: {METADATA_PATH} not found. Run build_work_metadata.py first.", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(EMBEDDINGS_PATH):
        print(f"Error: {EMBEDDINGS_PATH} not found. Run build_item_embeddings.py first.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)

    rows, emb_dim = build_work_rows(METADATA_PATH, EMBEDDINGS_PATH, CONFIG_PATH)
    if emb_dim != expected_dim:
        print(
            f"Error: embedding dimension is {emb_dim}, expected {expected_dim} (crud app). "
            f"Adjust factors/genres in pipeline or set EXPECTED_EMBEDDING_DIM if you know what you are doing.",
            file=sys.stderr,
        )
        sys.exit(1)

    for r in rows[:5]:
        f = row_to_crud_book_fields(r)
        if len(f["Embedding"]) != expected_dim:
            print(f"Error: row embedding length {len(f['Embedding'])} != {expected_dim}", file=sys.stderr)
            sys.exit(1)

    preamble = os.path.join(args.out_dir, "books_prod_preamble.sql")
    inserts = os.path.join(args.out_dir, "books_prod_inserts.sql")
    postamble = os.path.join(args.out_dir, "books_prod_postamble.sql")

    _copy_sql_template("prod_books_replace_preamble.sql", preamble)
    _write_inserts(inserts, rows, batch_size=args.batch_size)
    _copy_sql_template("prod_books_replace_postamble.sql", postamble)

    manifest = os.path.join(args.out_dir, "books_prod_manifest.txt")
    with open(manifest, "w", encoding="utf-8") as f:
        f.write(f"row_count={len(rows)}\n")
        f.write(f"embedding_dim={emb_dim}\n")
        f.write(f"files={preamble}\n{inserts}\n{postamble}\n")

    print(f"Wrote {len(rows)} books to:", flush=True)
    print(f"  {preamble}", flush=True)
    print(f"  {inserts}", flush=True)
    print(f"  {postamble}", flush=True)
    print(f"  {manifest}", flush=True)


if __name__ == "__main__":
    main()
