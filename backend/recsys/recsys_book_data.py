"""
Shared logic: build recsys work rows (metadata + genre-extended embeddings) from artifacts.

Used by load_to_postgres.py and export_books_for_prod.py.
Production CRUD expects book embeddings of length 72 (see crud.Entities.Book / EmbeddingService).
"""
from __future__ import annotations

import json
import os
from typing import Any

import numpy as np

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
METADATA_PATH = os.path.join(ARTIFACTS_DIR, "work_metadata.json")
EMBEDDINGS_PATH = os.path.join(ARTIFACTS_DIR, "item_embeddings.npz")
CONFIG_PATH = os.path.join(ARTIFACTS_DIR, "item_embeddings_config.json")
DEFAULT_BASE_EMBEDDING_DIM = 32

# Must match crud EmbeddingService.Dimensions / Book.EmbeddingDimensions
PROD_BOOK_EMBEDDING_DIM = 72


def load_metadata(path: str) -> dict[str, Any]:
    """Load work_id -> {title, title_without_series, author, isbn10, isbn13, language, genre, cover_url}."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_embeddings(path: str) -> tuple[list[Any], np.ndarray]:
    """Load work_id array and embedding matrix from npz. Return (work_ids, embeddings)."""
    data = np.load(path, allow_pickle=True)
    work_ids = data["work_id"].tolist()
    embeddings = np.asarray(data["embedding"], dtype=np.float32)
    return work_ids, embeddings


def build_genre_index(metadata: dict, work_ids: set) -> tuple[dict[str, int], int]:
    """Collect unique genres from metadata for given work_ids. Return (genre_name -> index, N)."""
    genres: set[str] = set()
    for wid in work_ids:
        m = metadata.get(wid)
        if not m:
            continue
        g = m.get("genre")
        if g and isinstance(g, dict):
            genres.update(g.keys())
    genre_list = sorted(genres)
    return {g: i for i, g in enumerate(genre_list)}, len(genre_list)


def get_base_embedding_dim(config_path: str = CONFIG_PATH) -> int:
    """Read base embedding dimension from item_embeddings_config.json (key 'factors'), fallback DEFAULT."""
    if not os.path.isfile(config_path):
        return DEFAULT_BASE_EMBEDDING_DIM
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
    return int(config.get("factors", DEFAULT_BASE_EMBEDDING_DIM))


def enhance_embedding(
    base: np.ndarray,
    genre_weights: dict | None,
    genre_to_idx: dict[str, int],
    base_dim: int,
) -> np.ndarray:
    """Extend base (base_dim) with genre dimensions (same formula as load_to_postgres)."""
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


def build_work_rows(
    metadata_path: str = METADATA_PATH,
    embeddings_path: str = EMBEDDINGS_PATH,
    config_path: str = CONFIG_PATH,
) -> tuple[list[dict[str, Any]], int]:
    """
    Build rows aligned with load_to_postgres INSERT into works.

    Each row: work_id, title, title_without_series, author, isbn10, isbn13, language,
    cover_url, genres (list[str]), embedding (np.ndarray float32, L2-normalized).
    """
    if not os.path.isfile(metadata_path):
        raise FileNotFoundError(f"Metadata not found: {metadata_path}")
    if not os.path.isfile(embeddings_path):
        raise FileNotFoundError(f"Embeddings not found: {embeddings_path}")

    metadata = load_metadata(metadata_path)
    embed_work_ids, embeddings = load_embeddings(embeddings_path)
    embed_by_work = {str(wid): embeddings[i] for i, wid in enumerate(embed_work_ids)}

    work_ids = set(embed_by_work.keys()) & set(metadata.keys())
    genre_to_idx, _n_genres = build_genre_index(metadata, work_ids)
    base_dim = get_base_embedding_dim(config_path)
    emb_dim = base_dim + len(genre_to_idx)

    rows: list[dict[str, Any]] = []
    for wid in sorted(work_ids):
        m = metadata[wid]
        base = embed_by_work[wid]
        genre_weights = m.get("genre") if isinstance(m.get("genre"), dict) else None
        ext = enhance_embedding(base, genre_weights, genre_to_idx, base_dim)
        norm = float(np.linalg.norm(ext))
        if norm > 0:
            ext = (ext / norm).astype(np.float32)
        garr = genres_array(genre_weights)
        rows.append(
            {
                "work_id": wid,
                "title": m.get("title"),
                "title_without_series": m.get("title_without_series"),
                "author": m.get("author"),
                "isbn10": m.get("isbn10"),
                "isbn13": m.get("isbn13"),
                "language": m.get("language"),
                "cover_url": m.get("cover_url"),
                "genres": garr,
                "embedding": ext,
            }
        )

    return rows, emb_dim


def row_to_crud_book_fields(row: dict[str, Any]) -> dict[str, Any]:
    """
    Map a recsys work row to crud.Book columns (no Id).

    - Title / Author: non-empty strings required by EF
    - Description: always ''
    - Genre: comma-separated genre names
    - CoverUrl: string
    - ReleaseDate: None (NULL)
    - Embedding: list of 72 floats (must match row embedding length)
    """
    m_title = row.get("title_without_series") or row.get("title") or ""
    m_title = str(m_title).strip() or "Unknown"
    author = row.get("author") or ""
    author = str(author).strip() or "Unknown"
    genres = row.get("genres") or []
    genre_str = ", ".join(str(g) for g in genres) if genres else ""
    cover = row.get("cover_url") or ""
    cover = str(cover)
    emb = row["embedding"]
    if hasattr(emb, "tolist"):
        emb_list = [float(x) for x in emb.tolist()]
    else:
        emb_list = [float(x) for x in emb]
    return {
        "Title": m_title,
        "Author": author,
        "Description": "",
        "Genre": genre_str,
        "CoverUrl": cover,
        "ReleaseDate": None,
        "Embedding": emb_list,
    }
