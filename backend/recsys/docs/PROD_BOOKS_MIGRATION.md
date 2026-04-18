# Production books migration (recsys → `crud."Books"`)

This runbook replaces **all** rows in `crud."Books"` on `selectio_main` with books built from recsys artifacts, including **72-dimensional** `real[]` embeddings (required by the CRUD API).

## Field mapping (recsys → `crud."Books"`)

| `crud."Books"` column | Source |
|----------------------|--------|
| `Id` | Generated (identity); do not insert explicitly |
| `Title` | `title_without_series` or `title`; empty → `'Unknown'` |
| `Author` | `author`; empty → `'Unknown'` |
| `Description` | `''` |
| `Genre` | Comma-separated genre names (weight > 0.1), same as recsys `genres` array |
| `CoverUrl` | `cover_url` or `''` |
| `ReleaseDate` | `NULL` |
| `Embedding` | Same L2-normalized vector as recsys `works` / `load_to_postgres.py` (must be length **72**) |

Embedding logic lives in [`recsys_book_data.py`](../recsys_book_data.py). Dimension is `factors` (from `item_embeddings_config.json`) + number of unique genres across the intersected works; the export script **fails** if that sum ≠ 72.

## What gets wiped on production

The preamble transaction **deletes all** rows from:

`PostLikes`, `PostComments`, `FavoritePosts`, `Posts`, `BookComments`, `UserBooks`

then **truncates** `crud."Books"`. This is required because `Posts` reference `Books` with `ON DELETE RESTRICT`.

Canonical SQL: [`../sql/prod_books_replace_preamble.sql`](../sql/prod_books_replace_preamble.sql), [`../sql/prod_books_replace_postamble.sql`](../sql/prod_books_replace_postamble.sql).

## 1. Generate load files (local or CI)

From repo `backend/recsys`:

```bash
cd recsys
python export_books_for_prod.py --out-dir ./artifacts
```

Produces (under `--out-dir`):

- `books_prod_preamble.sql` — copy of `sql/prod_books_replace_preamble.sql`
- `books_prod_inserts.sql` — batched `INSERT`s
- `books_prod_postamble.sql` — sequence `setval` + `COMMIT`
- `books_prod_manifest.txt` — `row_count` and `embedding_dim`

If embedding dim ≠ 72, fix artifacts/pipeline or set `EXPECTED_EMBEDDING_DIM` only if you accept breaking CRUD embedding endpoints.

## 2. Backup production (on server)

SSH example (adjust user/host/DB name if needed):

```bash
ssh root@85.239.40.129
TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p /root/db_backups
pg_dump -h localhost -U postgres -d selectio_main \
  --schema=crud \
  -t 'crud."Books"' -t 'crud."UserBooks"' -t 'crud."BookComments"' \
  -t 'crud."Posts"' -t 'crud."PostLikes"' -t 'crud."PostComments"' -t 'crud."FavoritePosts"' \
  -F c -f "/root/db_backups/selectio_crud_books_${TS}.dump"
```

Plain SQL alternative for Books only (smaller; **not** sufficient for full rollback of dependent tables):

```bash
pg_dump -h localhost -U postgres -d selectio_main \
  --schema=crud -t 'crud."Books"' \
  --inserts -f "/root/db_backups/selectio_Books_${TS}.sql"
```

## 3. Copy SQL to server

From machine that has the generated files:

```bash
scp recsys/artifacts/books_prod_{preamble,inserts,postamble}.sql root@85.239.40.129:/root/db_backups/
```

## 4. Apply migration (server)

Use a single session so `BEGIN` / `COMMIT` wrap everything:

```bash
export PGPASSWORD='***'   # or .pgpass
psql -h localhost -U postgres -d selectio_main -v ON_ERROR_STOP=1 \
  -f /root/db_backups/books_prod_preamble.sql \
  -f /root/db_backups/books_prod_inserts.sql \
  -f /root/db_backups/books_prod_postamble.sql
```

`ON_ERROR_STOP=1` aborts on first failure (transaction rolls back if error occurs before `COMMIT`).

Large `books_prod_inserts.sql` may take a long time; consider `statement_timeout = 0` (already in preamble via `SET LOCAL`).

## 5. Verification (SQL)

```sql
-- Row count (compare to books_prod_manifest.txt row_count)
SELECT COUNT(*) FROM crud."Books";

-- All embeddings present and 72-dim
SELECT COUNT(*) FILTER (WHERE "Embedding" IS NULL) AS null_emb,
       COUNT(*) FILTER (WHERE array_length("Embedding", 1) <> 72) AS bad_len
FROM crud."Books";

-- Sample
SELECT "Id", "Title", "Author", array_length("Embedding", 1) AS emb_len
FROM crud."Books" ORDER BY "Id" LIMIT 5;
```

Expect `null_emb = 0`, `bad_len = 0`.

## 6. Verification (HTTP)

After restarting or flushing app if needed, from a host that can reach the gateway:

```bash
curl -sS "http://<gateway-host>:8080/api/books?page=1&pageSize=5" | head
```

Recommended feed requires auth:

```bash
curl -sS -H "Authorization: Bearer <jwt>" \
  "http://<gateway-host>:8080/api/books/recommended?page=1&pageSize=5"
```

## 7. Rollback

If you used the **custom format** `pg_dump` (`-F c`) covering all cleared tables:

```bash
pg_restore -h localhost -U postgres -d selectio_main --clean --if-exists \
  -t 'crud."Books"' -t 'crud."UserBooks"' -t 'crud."BookComments"' \
  -t 'crud."Posts"' -t 'crud."PostLikes"' -t 'crud."PostComments"' -t 'crud."FavoritePosts"' \
  /root/db_backups/selectio_crud_books_<TS>.dump
```

**Warning:** `--clean` drops objects before restore; test flags on a staging clone first.

If you only have a plain SQL dump of `Books`, you can restore titles/data but **not** posts/library rows deleted by the preamble—prefer the full schema-qualified dump above.

## Reference

- Export script: [`export_books_for_prod.py`](../export_books_for_prod.py)
- Row / embedding builder: [`recsys_book_data.py`](../recsys_book_data.py)
- Recsys loader (separate DB / `works` table): [`load_to_postgres.py`](../load_to_postgres.py)
