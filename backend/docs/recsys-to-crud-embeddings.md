# Copying book embeddings from recsys into CRUD

The recommendation stack trains ALS + genre features in the **recsys** Postgres instance (see repo recsys tooling). CRUD stores the same 72-dimensional vectors on `crud."Books"."Embedding"`, `crud."Posts"."Embedding"`, and `crud."Communities"."Embedding"` as **`vector(72)`** (pgvector), with **HNSW** indexes for fast cosine-distance retrieval.

## After a training run

1. Export work ids and vectors from recsys (dimension 72) in a form PostgreSQL can read as `vector(72)` (CSV or SQL literals).
2. Truncate or upsert `crud."Books"` rows you intend to replace (respect foreign keys from posts and library).
3. Load into CRUD with `UPDATE ... SET "Embedding" = '[...]'::vector(72)` (bracket vector text) or cast from a float array literal where appropriate.

Until an automated ETL script is checked in, the historical path uses hand-maintained SQL batches (e.g. `prod_books_replace_*.sql` if present in your deployment repo). Keep **gateway URLs** in `PhotoUrl` / `CoverUrl` / `AvatarUrl` fields when wiring uploads.

## HNSW maintenance

After very large bulk loads or major distribution shifts, consider **rebuilding** the HNSW indexes on `Books`, `Posts`, and `Communities` (e.g. `REINDEX INDEX CONCURRENTLY crud."IX_Books_Embedding_hnsw"` and the analogous post/community index names) so recall stays stable. See the [pgvector README](https://github.com/pgvector/pgvector#hnsw) for tuning `m` / `ef_construction` if you change index parameters.

The `vector` extension is installed in the **`public`** schema so Npgsql’s `UseVector()` type mapping matches the column type OID (`vector`, not `crud.vector`). The CRUD connection string uses **`Search Path=crud,public`** so PostgreSQL resolves `vector` / operator classes while unqualified table names still resolve in **`crud`** first.

## Health checks

- `GET /api/books/recommended` and `GET /api/posts/recommended` use pgvector **cosine distance** with the HNSW-backed columns (ANN-style `ORDER BY ... <=> query`).
- If no embeddings are loaded, these endpoints return empty lists; the app should fall back to popular/search lists.
