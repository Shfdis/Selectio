-- Top-N queries for work-level embeddings (cosine distance).
-- Assumes embeddings are L2-normalized.

-- A) Similar works for a given seed work_id
-- Params:
--   $1::bigint = seed work_id
--   $2::int    = N
WITH seed AS (
  SELECT embedding
  FROM work_embeddings_v1
  WHERE work_id = $1
)
SELECT w.work_id,
       (1.0 - (w.embedding <=> seed.embedding)) AS cosine_similarity
FROM work_embeddings_v1 w, seed
WHERE w.work_id <> $1
ORDER BY w.embedding <=> seed.embedding
LIMIT $2;

-- B) Similar *books* for a given seed work_id (maps to representative book_id)
-- Params:
--   $1::bigint = seed work_id
--   $2::int    = N
WITH nn AS (
  WITH seed AS (
    SELECT embedding
    FROM work_embeddings_v1
    WHERE work_id = $1
  )
  SELECT w.work_id,
         (1.0 - (w.embedding <=> seed.embedding)) AS cosine_similarity
  FROM work_embeddings_v1 w, seed
  WHERE w.work_id <> $1
  ORDER BY w.embedding <=> seed.embedding
  LIMIT $2
)
SELECT nn.work_id,
       m.representative_book_id,
       nn.cosine_similarity
FROM nn
JOIN work_to_representative_book_v1 m USING (work_id)
ORDER BY nn.cosine_similarity DESC;

-- C) Recommendations from a work-level user profile (list of liked work_ids)
-- Params:
--   $1::bigint[] = liked work_ids
--   $2::int      = N
--
-- Notes:
-- - Uses avg(embedding) as a simple profile vector.
WITH profile AS (
  SELECT avg(embedding) AS embedding
  FROM work_embeddings_v1
  WHERE work_id = ANY($1)
),
liked AS (
  SELECT unnest($1::bigint[]) AS work_id
)
SELECT w.work_id,
       (1.0 - (w.embedding <=> profile.embedding)) AS cosine_similarity
FROM work_embeddings_v1 w, profile
WHERE w.work_id NOT IN (SELECT work_id FROM liked)
ORDER BY w.embedding <=> profile.embedding
LIMIT $2;

-- D) Same as C), but returning representative_book_id for UI.
-- Params:
--   $1::bigint[] = liked work_ids
--   $2::int      = N
WITH profile AS (
  SELECT avg(embedding) AS embedding
  FROM work_embeddings_v1
  WHERE work_id = ANY($1)
),
liked AS (
  SELECT unnest($1::bigint[]) AS work_id
),
nn AS (
  SELECT w.work_id,
         (1.0 - (w.embedding <=> profile.embedding)) AS cosine_similarity
  FROM work_embeddings_v1 w, profile
  WHERE w.work_id NOT IN (SELECT work_id FROM liked)
  ORDER BY w.embedding <=> profile.embedding
  LIMIT $2
)
SELECT nn.work_id,
       m.representative_book_id,
       nn.cosine_similarity
FROM nn
JOIN work_to_representative_book_v1 m USING (work_id)
ORDER BY nn.cosine_similarity DESC;

