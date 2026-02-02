-- pgvector schema for work-level ALS factors

CREATE EXTENSION IF NOT EXISTS vector;

-- Version these tables so retrains don't silently break consumers.
CREATE TABLE IF NOT EXISTS work_embeddings_v1 (
  work_id BIGINT PRIMARY KEY,
  embedding vector(256) NOT NULL
);

CREATE TABLE IF NOT EXISTS work_to_representative_book_v1 (
  work_id BIGINT PRIMARY KEY,
  representative_book_id BIGINT NOT NULL
);

-- Prefer HNSW for fast ANN if available in your pgvector build.
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS work_embeddings_v1_embedding_hnsw
    ON work_embeddings_v1 USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN others THEN
  RAISE NOTICE 'HNSW index creation failed; consider IVFFlat index instead.';
END $$;

