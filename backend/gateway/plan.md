# API Gateway — Implementation & Test Plan

This plan defines how to implement the **API Gateway** as the *single enforcement point* for:

- JWT validation
- user identification
- authorization (User/Owner/Moderator/Admin)
- request shaping (trusted headers to internal services)

It is written to keep the gateway **easy to develop** and **easy to test**.

## 0) Current state

- Gateway is currently an **nginx reverse proxy**:
  - `/auth/*` → `auth:8080/*`
  - `/crud/*` → `crud:8090/*`
- It does **no authentication/authorization** yet.

## 1) Non‑negotiable requirements

- **All validation happens at the Gateway**:
  - services must not depend on client-provided JWT/identity
  - services must treat identity as coming from **trusted gateway headers**
- **Header trust boundary**:
  - the gateway must **strip** any incoming `X-User-*` headers from the public request
  - the gateway must inject its own `X-User-*` headers when forwarding internally
- **Internal services are not exposed** in “gateway-only” mode (`docker-compose.gateway.yml`).
- **Service data separation**:
  - services share one Postgres database, but each service owns its own schema (e.g. `auth.*`, `crud.*`)
  - services must not assume tables live in `public`

## 2) Technology decision (two viable options)

### Option A (recommended): .NET Reverse Proxy (YARP)

Implement the gateway as an ASP.NET Core 8 service using **YARP**:

- straightforward JWT validation and policy code in C#
- easy to write unit/integration tests
- simplest path to “owner/moderator checks” via internal calls to CRUD

### Option B: Nginx/OpenResty (Lua) gateway

Keep nginx, but add JWT validation + authorization via:

- OpenResty (Lua) or `auth_request` to a dedicated authz sidecar service

This can work, but tends to be **harder to maintain** and test compared to YARP.

**Plan assumes Option A** (YARP). If you decide Option B, keep the same milestones, just different implementation.

## 3) Gateway API surface (external)

- `GET /health` (public)
- `GET /version` (public)

Routing (examples):

- `/api/auth/*` → Auth service
- `/api/*` → CRUD service (and later Recommendation)

## 4) Routing plan

### 4.1 Define route map

Create a route table aligned with `TZ`:

- **Auth**:
  - `/api/auth/*` → auth service
- **CRUD**:
  - `/api/books*`, `/api/users*`, `/api/communities*`, `/api/posts*`, `/api/comments*` → crud service
- **Recommendation** (later):
  - `/api/recommendations/*`, `/api/similar/*` → recommendation service

**Definition of done**
- Requests reach correct downstream service (verified by integration tests).

### 4.2 Standardize error shape at the gateway

Gateway returns consistent errors for validation/authorization failures, e.g.:

```json
{ "error": { "code": "unauthorized", "message": "..." } }
```

## 5) Authentication plan (JWT)

### 5.1 Validate JWT on all protected routes

- Read `Authorization: Bearer <token>`
- Validate:
  - signature (`Jwt:SecretKey` or asymmetric key if upgraded)
  - issuer, audience
  - expiry

### 5.2 Derive caller identity

Extract from token claims:

- `userId` from `NameIdentifier` (required)
- optional: email/name for logging/auditing

### 5.3 Inject trusted identity headers to internal services

Before proxying, gateway injects:

- `X-User-Id: <int>`
- (optional) `X-User-Email`, `X-User-Name`

And strips any incoming headers with the same names.

**Definition of done**
- Protected route without JWT → 401
- Protected route with valid JWT → forwarded with correct `X-User-Id`

## 6) Authorization plan (User/Owner/Moderator)

### 6.1 Endpoint classification

Maintain a mapping of endpoint → requirement:

- Public (no JWT)
- User (any JWT)
- Owner (JWT + resource ownership)
- Moderator (JWT + membership role)
- Admin (optional)

### 6.2 Owner checks

Where required, gateway verifies ownership by calling CRUD “internal read” endpoints or direct DB query endpoint (choose one):

- **Preferred**: internal CRUD read endpoint:
  - fetch post/comment by id, compare `authorUserId`
- Alternative: query DB (not recommended across service boundaries)

### 6.3 Moderator checks

Gateway verifies moderator role by querying CRUD:

- check `CommunityMembers` for `(communityId, userId)` and role

**Definition of done**
- Owner-only endpoints reject non-owners with 403 at the gateway
- Moderator-only endpoints reject non-moderators with 403 at the gateway

## 7) Security hardening

- **Do not forward client JWT** to internal services unless explicitly needed.
- Strip hop-by-hop headers and untrusted identity headers.
- Rate limit login/registration routes.
- Request size limits for large bodies.

## 8) Observability

- Add request logging with correlation IDs:
  - gateway generates `X-Request-Id` if missing
  - forwards to downstream services
- Basic latency metrics per route group (auth/crud/reco).

## 9) Testing plan

### 9.1 Compose modes

- **All-exposed**: `docker-compose.yml` (useful for debugging, not security-realistic)
- **Gateway-only**: `docker-compose.gateway.yml` (security-realistic; primary target for gateway tests)

### 9.2 Integration tests (pytest)

Add `backend/test/test_gateway_*.py` tests that run against **gateway-only** compose:

- **Health/version**
  - `GET http://localhost:8080/health` → 200
- **Routing**
  - `GET /api/books` reaches CRUD (200)
  - `GET /api/auth/*` reaches Auth (expected status code)
- **Header stripping**
  - send `X-User-Id: 999` from client → downstream must not see it unless JWT validated
- **Auth enforcement**
  - protected endpoint without JWT → 401
  - protected endpoint with valid JWT → forwarded with `X-User-Id`
- **Owner/moderator enforcement**
  - create resource as user A, attempt modify as user B → gateway returns 403

### 9.3 Unit tests (optional)

If using YARP/.NET:

- unit tests for route classification and policy evaluation (pure functions)

## 10) Delivery checklist

- Gateway must be the **only exposed service** in `docker-compose.gateway.yml`.
- Gateway must **strip** untrusted headers and inject trusted `X-User-Id`.
- Gateway must enforce **User/Owner/Moderator** rules and return consistent 401/403 errors.
- CRUD/Auth services should be callable only through the gateway in gateway-only mode.

