## Work-level ALS recommender (full catalog) + pgvector

This directory contains a standalone, offline recommendation pipeline that:

- Builds a **work-level** mapping (`book_id -> work_id`) from `goodreads_books.json.gz`
- Aggregates interactions to `(user_id, work_id)` from `goodreads_interactions.csv`
- Trains an implicit-feedback **ALS** model to produce **work embeddings**
- Optionally loads work embeddings + mappings into Postgres using **pgvector**

It is intentionally **not integrated** into the backend/API yet.

