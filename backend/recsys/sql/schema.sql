-- Recsys schema for pgvector.
-- The works table embedding dimension is 32 + N (N = num unique genres) and is
-- created dynamically by load_to_postgres.py.

CREATE EXTENSION IF NOT EXISTS vector;

-- works table: created by load_to_postgres.py with embedding vector(32 + num_genres).
-- Columns: work_id, title, title_without_series, author, title_ru, author_ru, isbn10, isbn13, language, cover_url, genres TEXT[], embedding vector(...)
-- HNSW index: CREATE INDEX ON works USING hnsw (embedding vector_cosine_ops);
