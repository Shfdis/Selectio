# Selectio backend

This directory contains the .NET services, Docker Compose stack, and pytest suite for the Selectio API.

## Local URLs (default `docker-compose.yml` port mappings)

| Role | URL | Notes |
|------|-----|--------|
| **API gateway** (what clients should use) | `http://localhost:8000` | JWT on `/api/**` except public routes; merged OpenAPI in Development: `http://localhost:8000/docs/all/openapi.json` |
| Auth service (direct) | `http://localhost:8080` | Used by the gateway for `/api/auth/**`; mobile apps should prefer the gateway on **8000** |
| CRUD service (direct) | `http://localhost:8090` | Internal/testing; pytest passes `X-User-Id` where the gateway would inject identity |
| MinIO console (when enabled) | `http://localhost:9001` | Only when the image stack is running; object API on **9000** is not required on the host |

Copy `.env.template` to `.env` and set secrets (JWT, `GATEWAY_INTERNAL_TOKEN`, optional email). Pytest starts Compose from this folder and waits for auth (8080), CRUD (8090), and the gateway (8000).

## Image uploads

Authenticated clients call `POST http://localhost:8000/api/images` (multipart) and receive a JSON `url` on the **gateway host**. They load bytes with `GET` on that same URL path (under `/media/...`). Do not send clients to MinIO’s port for production traffic.

## Embeddings

The CRUD service targets **.NET 9** with **EF Core 9**, **Npgsql 9**, and **`Pgvector.EntityFrameworkCore`**. Book, post, and community embeddings are stored as PostgreSQL **`vector(72)`** with **HNSW** indexes (`vector_cosine_ops`). Recommended books and posts are ranked with **approximate nearest neighbor** search using pgvector’s **cosine distance** (`<=>`) over the indexed vectors. Use **`Search Path=crud,public`** on the CRUD connection string so the `vector` type (installed in `public`) resolves while tables stay in the `crud` schema. How to bulk-load vectors from the recsys database is described in `docs/recsys-to-crud-embeddings.md`.
