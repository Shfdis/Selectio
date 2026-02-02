from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
import psycopg2
from pgvector.psycopg2 import register_vector
from psycopg2.extras import execute_values

from .io_utils import read_json


def _connect():
    dsn = os.environ.get("DATABASE_URL")
    if dsn:
        conn = psycopg2.connect(dsn)
    else:
        conn = psycopg2.connect("")
    register_vector(conn)
    return conn


def _load_work_factors(artifacts: Path) -> Tuple[np.ndarray, np.ndarray]:
    work_ids = np.asarray(read_json(artifacts / "index_to_work_id.json"), dtype=np.int64)
    factors = np.load(str(artifacts / "als_work_factors.npy")).astype(np.float32, copy=False)
    if factors.shape[0] != work_ids.shape[0]:
        raise RuntimeError(
            f"als_work_factors rows ({factors.shape[0]}) != index_to_work_id ({work_ids.shape[0]})"
        )
    return work_ids, factors


def _load_work_to_rep_book(artifacts: Path, *, mapping_dir: Path) -> Dict[int, int]:
    """
    mapping_dir: output dir from build_work_mapping.py containing work_to_representative_book.json
    """
    d = read_json(mapping_dir / "work_to_representative_book.json")
    return {int(k): int(v) for k, v in d.items()}


def upsert_work_embeddings(
    *, artifacts: Path, table: str, batch_size: int
) -> None:
    work_ids, factors = _load_work_factors(artifacts)
    conn = _connect()
    try:
        with conn.cursor() as cur:
            rows = [(int(wid), factors[i].tolist()) for i, wid in enumerate(work_ids.tolist())]
            for start in range(0, len(rows), int(batch_size)):
                chunk = rows[start : start + int(batch_size)]
                execute_values(
                    cur,
                    f"""
                    INSERT INTO {table} (work_id, embedding)
                    VALUES %s
                    ON CONFLICT (work_id) DO UPDATE SET embedding = EXCLUDED.embedding
                    """,
                    chunk,
                    page_size=int(batch_size),
                )
            conn.commit()
    finally:
        conn.close()


def upsert_work_to_rep_book(
    *, artifacts: Path, mapping_dir: Path, table: str, batch_size: int
) -> None:
    work_ids = np.asarray(read_json(artifacts / "index_to_work_id.json"), dtype=np.int64)
    rep = _load_work_to_rep_book(artifacts, mapping_dir=mapping_dir)
    rows = [(int(wid), int(rep.get(int(wid), 0))) for wid in work_ids.tolist()]
    # Ensure all reps exist; if missing mapping, set to 0 and skip those rows.
    rows = [(wid, bid) for (wid, bid) in rows if int(bid) > 0]

    conn = _connect()
    try:
        with conn.cursor() as cur:
            for start in range(0, len(rows), int(batch_size)):
                chunk = rows[start : start + int(batch_size)]
                execute_values(
                    cur,
                    f"""
                    INSERT INTO {table} (work_id, representative_book_id)
                    VALUES %s
                    ON CONFLICT (work_id) DO UPDATE SET representative_book_id = EXCLUDED.representative_book_id
                    """,
                    chunk,
                    page_size=int(batch_size),
                )
            conn.commit()
    finally:
        conn.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="Load work-level factors into Postgres (pgvector).")
    ap.add_argument("--artifacts", required=True, help="Artifacts dir from build_matrix/train_als")
    ap.add_argument(
        "--mapping",
        required=True,
        help="Artifacts dir from build_work_mapping.py (contains work_to_representative_book.json)",
    )
    ap.add_argument("--emb_table", default="work_embeddings_v1")
    ap.add_argument("--map_table", default="work_to_representative_book_v1")
    ap.add_argument("--batch_size", type=int, default=1000)
    args = ap.parse_args()

    artifacts = Path(args.artifacts)
    mapping_dir = Path(args.mapping)

    upsert_work_embeddings(artifacts=artifacts, table=str(args.emb_table), batch_size=int(args.batch_size))
    upsert_work_to_rep_book(
        artifacts=artifacts,
        mapping_dir=mapping_dir,
        table=str(args.map_table),
        batch_size=int(args.batch_size),
    )
    print("[OK] loaded embeddings + mapping into Postgres", flush=True)


if __name__ == "__main__":
    main()

