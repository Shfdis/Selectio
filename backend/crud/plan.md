# CRUD Service — Implementation & Test Plan

This plan is **implementation-focused** but intentionally avoids writing business logic until the plan is agreed and infrastructure is stable.

## 0) Constraints and invariants

- **Validation/authorization is enforced at the API Gateway**.
  - Gateway validates JWT, derives `userId`, enforces User/Owner/Moderator rules.
  - CRUD service **trusts only internal headers from the Gateway** (never from the public internet):
    - `X-User-Id: <int>` (required for user-scoped endpoints)
    - optionally `X-User-Name`, `X-User-Email`
- **CRUD is the source of truth** for: profiles, books, user library, communities, posts, comments, likes, favorites.
- **No direct DB links to Auth**: `userId` is a cross-service identifier only.

## 1) Repo layout (target inside `backend/crud/`)

Keep it small and predictable:

- `Program.cs` (composition root, minimal)
- `Data/CrudDbContext.cs`
- `Entities/` (EF entities only)
- `Contracts/` (DTOs for requests/responses; no EF entities exposed)
- `Endpoints/` (Minimal API route groups per resource)
- `Migrations/` (EF Core migrations)
- `Dockerfile`, `.dockerignore`, `appsettings*.json`

## 2) Infrastructure milestones (do first)

### 2.1 Database wiring

- Use Postgres connection string `ConnectionStrings:CrudDb`.
- CRUD tables live in the Postgres schema `crud` (one DB shared across services, one schema per service).
- Adopt one migration strategy:
  - **Dev**: apply migrations on startup (fast local feedback)
  - **CI/Prod**: run migrations via a one-off job/container (recommended long-term)

**Definition of done**
- `dotnet build` succeeds
- container starts with Postgres and can connect
- DB schema exists after migration run

### 2.2 Operational endpoints

Add only two operational endpoints (no domain logic):

- `GET /health` → `200 { status: "ok" }`
- `GET /version` → `200 { service: "crud", version: "<semver>" }`

These are used by docker healthchecks and the Python test harness.

**Definition of done**
- `docker compose up crud` yields `/health` = 200

### 2.3 Gateway identity header contract (scaffold only)

Implement a single helper used by future endpoints:

- `GetUserIdOr401(HttpContext)` (reads `X-User-Id`)

**Rule**
- This helper does not validate JWT or roles (Gateway already did).

## 3) Endpoint implementation plan (feature slices)

Implement in the order below to keep dependencies minimal.

### 3.1 Books

Endpoints (from `TZ.txt`):

- `GET /api/books`
- `GET /api/books/{id}`
- `GET /api/books/search`
- `GET /api/books/popular`

Notes:
- These are **Public** at Gateway; CRUD implements the query.
- Standardize pagination: `?page=&pageSize=` and stable sorting.

### 3.2 User library (UserBooks)

- `POST /api/books/{id}/library`
- `PUT /api/books/{id}/library`
- `DELETE /api/books/{id}/library`
- `PUT /api/books/{id}/rate`
- `GET /api/users/{id}/books`

Notes:
- Gateway enforces **User**; CRUD uses `X-User-Id` for self-scoped operations.
- For `GET /api/users/{id}/books`, keep it public unless privacy is added later.

### 3.3 Profiles

- `GET /api/users/{id}`
- `PUT /api/users/profile`

Notes:
- Update uses `X-User-Id` and updates that profile only.

### 3.4 Communities + membership

- `GET /api/communities`
- `POST /api/communities`
- `GET /api/communities/{id}`
- `POST /api/communities/{id}/join`
- `POST /api/communities/{id}/leave`
- `GET /api/users/{id}/communities`

Notes:
- Create sets `OwnerUserId = X-User-Id`.
- Membership uniqueness (communityId, userId) enforced by DB constraint.

### 3.5 Posts + feed

- `POST /api/posts` (published)
- `POST /api/posts/suggest` (suggested)
- `GET /api/posts/{id}`
- `PUT /api/posts/{id}`
- `DELETE /api/posts/{id}`
- `GET /api/communities/{id}/posts`

Notes:
- Gateway enforces membership/ownership rules; CRUD implements persistence.
- `GET /api/posts/{id}`: published is public; suggested should only be returned when Gateway has allowed access.

### 3.6 Comments

- `GET /api/posts/{id}/comments`
- `POST /api/posts/{id}/comments`
- `PUT /api/comments/{id}`
- `DELETE /api/comments/{id}`
- `GET /api/books/{id}/comments`
- `POST /api/books/{id}/comments` (rating required)

Notes:
- Author is `X-User-Id`.
- Nested comments (comments on comments) are not supported - all comments are top-level only.

### 3.7 Likes + favorites

- `POST /api/posts/{id}/like`
- `DELETE /api/posts/{id}/like`
- `POST /api/posts/{id}/favorite`
- `DELETE /api/posts/{id}/favorite`
- `GET /api/users/favorites`

Notes:
- Ensure idempotency where possible (like twice should not error).

### 3.8 Moderation

- `GET /api/communities/{id}/suggestions`
- `POST /api/posts/{id}/approve`
- `POST /api/posts/{id}/reject`

Notes:
- Gateway enforces moderator role; CRUD applies status transitions.

## 4) Testing plan (primary: integration tests via Python)

### 4.1 Test tooling and harness integration

- Add tests under `backend/test/` (pytest).
- Extend existing framework (`test_framework.py`) if needed to:
  - start/stop `crud` + `crud_postgres`
  - wait for `crud` readiness using `/health`

### 4.2 Auth/Gateway simulation in tests

Since gateway enforces auth:

- For user-scoped calls, tests send: `X-User-Id: 123`
- For “other user” behavior, send a different `X-User-Id`

### 4.3 DB isolation strategy (pick one)

- **Option A (simplest, slower)**: per test module, `docker compose down -v` then up
- **Option B (faster)**: truncate tables between tests (a test-only admin endpoint or direct DB access from tests)

### 4.4 Minimal test suite by feature slice

For each slice, implement tests immediately after the slice endpoints exist:

- **Health/Version**
  - `/health` returns 200
  - `/version` returns 200 and correct service name

- **Books**
  - list returns 200 and stable schema
  - get missing id → 404
  - search query returns 200

- **Library**
  - add to library (with `X-User-Id`)
  - update status
  - set rating (validate 1..5 if CRUD validates; otherwise rely on DB constraint)
  - remove
  - list by status

- **Communities**
  - create
  - join/leave
  - list user communities

- **Posts**
  - create published/suggested
  - edit/delete (with different `X-User-Id` to simulate owner vs non-owner; expected behavior depends on whether CRUD double-checks—preferred is to trust gateway, so tests focus on persistence)
  - community feed

- **Comments**
  - add/list/edit/delete for post comments
  - add/list for book comments (rating required)

- **Likes/Favorites**
  - like/unlike idempotency
  - favorite/unfavorite
  - list favorites

- **Moderation**
  - suggested list
  - approve/reject transitions

### 4.5 Definition of Done (testing)

- All implemented endpoints have at least:
  - 1 happy-path integration test
  - 1 not-found or invalid-input test (as applicable)
- Test suite is runnable via `make test` (no manual steps).

## 5) Delivery checklist (when implementing starts)

- Keep endpoints grouped in `Endpoints/*` files (one group per resource).
- Keep DTOs in `Contracts/`; do not return EF entities.
- Keep EF changes tracked via migrations.
- Keep docker-compose wiring stable and use healthchecks for readiness.

