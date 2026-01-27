# Selectio Backend — Requirements (condensed)

## 1. Purpose and scope

Selectio is a social network for book lovers. The backend provides:

- HTTP APIs for client apps (mobile/web)
- persistent storage for domain data
- authentication (email + password) and authorization (JWT)
- personalized recommendations (books/posts/communities)

This document is intentionally short and optimized for fast development.

## 2. Microservice architecture (target)

The backend is split into the following services:

- **API Gateway**
  - single external entrypoint (`/api/*`)
  - routes requests to internal services
  - applies cross-cutting concerns: CORS, rate limiting, request/response shaping, consistent error format
  - validates JWT and performs authorization checks (the single enforcement point)

- **Auth Service**
  - user registration, email verification, login, identity, account deletion
  - issues JWT access tokens

- **CRUD Service**
  - domain CRUD: profiles, books, library (status/rating), communities, posts, comments, likes, favorites

- **Recommendation Service**
  - embeddings + model lifecycle
  - generates recommendations (books/posts/communities)
  - provides “similar books” queries

## 3. Auth Service — current implementation requirements (as of today)

This section describes the Auth service as it is currently implemented in `backend/auth`.

### 3.1 Responsibilities

- **Register** a user by creating a pending record and sending an email verification link.
- **Verify** a pending registration (UUID) and create a verified user in the main DB.
- **Login** using email + password and issue a JWT access token.
- **Identify** the currently authenticated user from JWT claims.
- **Delete** the authenticated user account (tokens removed via cascade delete).

### 3.2 Storage

The Auth service uses two databases:

- **SQLite** (pending registrations)
  - table: `pending_emails`
  - primary key: `uuid` (GUID)
  - fields: `email`, `username`, `description`, `passwordHash`, `timestamp`
  - cleanup: pending registrations older than 24 hours are removed

- **PostgreSQL** (verified users + tokens)
  - table: `users`
    - unique constraints: `email`, `username`
    - fields: `id`, `email`, `username`, `description`, `passwordHash`, `createdAt`
  - table: `tokens`
    - fields: `id`, `userId`, `jwtToken`, `createdAt`, `expiresAt`, `isRevoked`
    - foreign key: `tokens.userId -> users.id` with **cascade delete**
    - note: tokens are currently stored on login, but not used for revocation checks

### 3.3 Password handling

- Passwords are hashed using **BCrypt** before being stored anywhere.
- Plaintext passwords must never be stored or logged.

### 3.4 Email verification

- When registration is created, the service attempts to send a verification email via SMTP.
- Email sending is **fire-and-forget** and must not fail the registration response.
- Verification links are constructed as:
  - `Email:BaseUrl + "/user/verify/{uuid}"`
- Expiration policy: pending registrations expire after **24 hours** (cleanup job).

### 3.5 JWT authentication

- JWT bearer auth is enabled.
- Validation rules:
  - issuer and audience are validated
  - signature is validated with `Jwt:SecretKey`
  - token lifetime is validated
- JWT claims issued on login:
  - `NameIdentifier` = `user.id`
  - `Email` = `user.email`
  - `Name` = `user.username`
- Token TTL is controlled by `Jwt:ExpiryMinutes` (default: 1440 minutes).

### 3.6 Public HTTP API (current routes)

All request/response bodies are JSON.

#### Registration

- **POST `/user`**
  - request body: `{ email, password, username, description }`
  - behavior:
    - stores pending registration (password hashed)
    - triggers async verification email send
  - success response: `200 OK` with `{ uuid, message }`

#### Email verification

- **POST `/user/verify/{uuid}`**
  - behavior:
    - if UUID exists in `pending_emails`: creates a verified user in Postgres, then removes pending record
    - on duplicates (email/username): returns `400 Bad Request`
  - errors:
    - `404 Not Found` if UUID is invalid

#### Login (note: route name is currently confusing)

- **POST `/user/verify`** (currently used for login)
  - request body: `{ email, password }`
  - behavior:
    - validates email + password (BCrypt)
    - issues a JWT token
    - stores token record in Postgres `tokens`
  - success response: `200 OK` with `{ token, expiresAt, user: { id, email, username } }`
  - errors: `401 Unauthorized` on invalid credentials

#### Identify current user

- **GET `/user/identify`**
  - auth: **required** (JWT bearer)
  - success response: `200 OK` with `{ id, email, username, description }`
  - errors:
    - `401 Unauthorized` if token missing/invalid
    - `404 Not Found` if user id from token does not exist

#### Delete account

- **DELETE `/user/delete`**
  - auth: **required** (JWT bearer)
  - behavior:
    - deletes user; tokens are cascade-deleted
  - success response: `200 OK` with `{ message }`
  - errors:
    - `401 Unauthorized` if token missing/invalid
    - `404 Not Found` if user does not exist

### 3.7 Background jobs

- A background service runs every hour and deletes pending registrations older than 24 hours.

### 3.8 Configuration (dev/prod)

- **Do not commit secrets** (SMTP passwords, JWT secret keys) to the repository.
- Configuration keys used by the Auth service:
  - `ConnectionStrings:PendingEmailsDb` (SQLite)
  - `ConnectionStrings:UsersDb` (Postgres)
  - `Jwt:SecretKey`, `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpiryMinutes`
  - `Email:SmtpHost`, `Email:SmtpPort`, `Email:SmtpUsername`, `Email:SmtpPassword`
  - `Email:FromEmail`, `Email:FromName`, `Email:BaseUrl`, `Email:AllowInsecureSsl`

## 4. Recommended adjustments (to keep the code concise and easy to develop)

These are small changes that reduce confusion and “dead code”, while keeping the implementation minimal.

### 4.1 Make routes self-explanatory and consistent

- Rename endpoints to an explicit auth prefix (via Gateway):
  - `POST /api/auth/register` (instead of `POST /user`)
  - `POST /api/auth/verify/{uuid}` (or `GET`, see below)
  - `POST /api/auth/login` (instead of `POST /user/verify`)
  - `GET /api/auth/me` (instead of `GET /user/identify`)
  - `DELETE /api/auth/me` (instead of `DELETE /user/delete`)

### 4.2 Fix the verification-link mismatch

The email link currently points to `/user/verify/{uuid}` but browsers follow links with **GET**.

Pick one approach:

- **Option A (simplest):** make verification endpoint `GET /user/verify/{uuid}`.
- **Option B (cleaner):** email link points to a frontend page, and the frontend calls `POST /user/verify/{uuid}`.

### 4.3 Either implement token revocation or remove token storage

Right now tokens are stored but not used:

- If you want revocation: check `tokens.isRevoked` (and/or presence) during JWT validation (e.g., `OnTokenValidated`).
- If you don’t need revocation: remove the `tokens` table and related writes to keep the service smaller.

### 4.4 Keep config secure and frictionless

- Use environment variables (Docker) or user-secrets in development.
- Never ship a hardcoded fallback `Jwt:SecretKey` in production builds.

### 4.5 Prefer migrations over `EnsureCreated` (when schema stabilizes)

`EnsureCreated` is okay early on, but migrations make schema changes predictable in teams and CI.

## 5. System HTTP API (required endpoints)

All endpoints below are **external** and are exposed via the **API Gateway** under the `/api` prefix.

### 5.0 Authentication, authorization, and user identification

#### Authentication (who is “logged in”)

- **Mechanism**: JWT Bearer tokens sent in `Authorization: Bearer <token>`.
- **Token issuer**: Auth Service.
- **Gateway behavior (required)**: the API Gateway validates JWT (issuer/audience/signature/expiry) and rejects invalid tokens.

#### User identification (how we know “who is calling”)

For authenticated requests, the **API Gateway**:

- Extracts `userId` from the JWT claim **`NameIdentifier`**.
- Rejects missing/invalid claims → `401 Unauthorized`.
- Forwards identity to internal services via trusted headers, e.g.:
  - `X-User-Id: <int>`
  - `X-User-Email: <string>` (optional)
  - `X-User-Name: <string>` (optional)

Internal services must **not** accept these headers from the public internet; they are only trusted on internal network from the Gateway.

#### Authorization (who is allowed to do what)

Use the following roles/levels in endpoint requirements:

- **Public**: no authentication required.
- **User**: any authenticated user (JWT required).
- **Owner**: authenticated user must own the resource (e.g., editing their own post/comment/profile).
- **Moderator**: authenticated user has moderator role in the target community.
- **Admin**: platform-wide admin (optional; can be added later).

Role information can be represented either:

- **Option A (simple now)**: Gateway performs a CRUD Service lookup (e.g., `CommunityMembers.role`) when it needs to enforce Moderator/Owner checks.
- **Option B (faster later)**: include roles/scopes in JWT (or a short-lived internal “gateway token”), so the Gateway can enforce without extra lookups.

**Rule**: authorization decisions are enforced at the Gateway; internal services assume requests are already authorized.

### 5.1 Auth Service (gateway routes)

- **POST `/api/auth/register`**: **Public** — create pending registration, send verification email
- **GET `/api/auth/verify/{uuid}`**: **Public** — verify email link (recommended for browser links)
  - alternative: **POST** `/api/auth/verify/{uuid}` (if verification is triggered by client app)
- **POST `/api/auth/login`**: **Public** — email + password → JWT (and refresh token if enabled)
- **POST `/api/auth/refresh`**: **Public** — refresh access token (required for mobile clients)
- **POST `/api/auth/logout`**: **User** — revoke refresh token (if refresh tokens are enabled)
  - identification: Gateway derives `userId` from JWT and/or refresh-token ownership
- **GET `/api/auth/me`**: **User** — identify current user
  - identification: Gateway derives `userId` from JWT `NameIdentifier`
- **DELETE `/api/auth/me`**: **User** — delete own account
  - identification: Gateway derives `userId` from JWT `NameIdentifier` (must match deleted account)

### 5.2 CRUD Service — Users / Profiles

- **GET `/api/users/{id}`**: **Public** — get public profile
- **PUT `/api/users/profile`**: **User** — update own profile
  - identification: Gateway derives `userId`; update applies to that `userId` only
- **GET `/api/users/{id}/books`**: **Public** — list a user’s library (filter by status)
  - note: if you later add “private library”, change to **Owner** or **User**
- **GET `/api/users/{id}/reviews`**: **Public** — list a user’s reviews
- **GET `/api/users/favorites`**: **User** — list current user’s favorite posts
  - identification: Gateway derives `userId`
- **GET `/api/users/{id}/communities`**: **Public** — list communities the user belongs to

### 5.3 CRUD Service — Books / Library

- **GET `/api/books`**: **Public** — list books (pagination + filters)
- **GET `/api/books/{id}`**: **Public** — get book details
- **GET `/api/books/search`**: **Public** — search by title/author
- **GET `/api/books/popular`**: **Public** — popular books (optionally by genre)
- **POST `/api/books/{id}/library`**: **User** — add book to current user’s library
  - identification: Gateway derives `userId` (library row uses this `userId`)
- **PUT `/api/books/{id}/library`**: **User** — update reading status in library
  - identification: Gateway derives `userId` (update row for this `userId` only)
- **DELETE `/api/books/{id}/library`**: **User** — remove book from library
  - identification: Gateway derives `userId`
- **PUT `/api/books/{id}/rate`**: **User** — set/update rating
  - identification: Gateway derives `userId`
- **GET `/api/books/{id}/comments`**: **Public** — list comments for a book
- **POST `/api/books/{id}/comments`**: **User** — add book comment (with required 1–5 rating)
  - identification: Gateway derives `userId` becomes comment author

### 5.4 CRUD Service — Communities

- **GET `/api/communities`**: **Public** — search/list communities
- **POST `/api/communities`**: **User** — create community
  - identification: Gateway derives `userId` becomes community owner
- **GET `/api/communities/{id}`**: **Public** — get community details
- **GET `/api/communities/{id}/posts`**: **Public** — community feed (published posts)
- **POST `/api/communities/{id}/join`**: **User** — join community
  - identification: Gateway derives `userId` becomes member
- **POST `/api/communities/{id}/leave`**: **User** — leave community
  - identification: Gateway derives `userId`

Moderation / suggested posts:

- **GET `/api/communities/{id}/suggestions`**: **Moderator** — list suggested posts
  - identification: Gateway derives `userId`; authorization: Gateway enforces membership role check in that community
- **POST `/api/posts/{id}/approve`**: **Moderator** — approve suggested post
  - identification: Gateway derives `userId`; authorization: Gateway enforces moderator of post’s community
- **POST `/api/posts/{id}/reject`**: **Moderator** — reject suggested post
  - identification: Gateway derives `userId`; authorization: Gateway enforces moderator of post’s community

### 5.5 CRUD Service — Posts / Social interactions

- **POST `/api/posts`**: **User** — create post in own community (bookId required)
  - identification: Gateway derives `userId` becomes post author; authorization: Gateway enforces membership (or owner) of target community
- **POST `/api/posts/suggest`**: **User** — suggest post to a community (bookId required)
  - identification: Gateway derives `userId` becomes post author; authorization: Gateway enforces per community rules
- **GET `/api/posts/{id}`**: **Public** — get post (published); suggested posts visible only to **Moderator**
  - identification (if auth provided): Gateway derives `userId` for visibility checks
- **PUT `/api/posts/{id}`**: **Owner** — edit post
  - identification: Gateway derives `userId` must equal `post.authorId` (or **Moderator/Admin** policy if added)
- **DELETE `/api/posts/{id}`**: **Owner** — delete post
  - identification: Gateway derives `userId` must equal `post.authorId` (or **Moderator/Admin** policy if added)
- **POST `/api/posts/{id}/like`**: **User** — like post
  - identification: Gateway derives `userId` becomes like author
- **DELETE `/api/posts/{id}/like`**: **User** — unlike post
  - identification: Gateway derives `userId`
- **POST `/api/posts/{id}/favorite`**: **User** — favorite post
  - identification: Gateway derives `userId`
- **DELETE `/api/posts/{id}/favorite`**: **User** — unfavorite post
  - identification: Gateway derives `userId`
- **GET `/api/posts/{id}/comments`**: **Public** — list post comments
- **POST `/api/posts/{id}/comments`**: **User** — add comment to a post
  - identification: Gateway derives `userId` becomes comment author
- **PUT `/api/comments/{id}`**: **Owner** — edit comment
  - identification: Gateway derives `userId` must equal `comment.authorId` (or **Moderator/Admin** policy if added)
- **DELETE `/api/comments/{id}`**: **Owner** — delete comment
  - identification: Gateway derives `userId` must equal `comment.authorId` (or **Moderator/Admin** policy if added)

### 5.6 Recommendation Service (gateway routes)

Canonical routes:

- **GET `/api/recommendations/books`**: personalized book recommendations
- **GET `/api/recommendations/posts`**: personalized post recommendations
- **GET `/api/recommendations/communities`**: personalized community recommendations
- **GET `/api/similar/books/{id}`**: similar books (item-to-item)

Auth and identification:

- `/api/recommendations/*`: **User** — recommendations are personalized
  - identification: Gateway derives `userId`; service uses it to fetch user interactions / embedding
- `/api/similar/books/{id}`: **Public** — item-to-item similarity does not require user identity

Compatibility aliases (optional, if you want to keep older client routes):

- **GET `/api/books/recommendations`** → `/api/recommendations/books`
- **GET `/api/posts/recommendations`** → `/api/recommendations/posts`
- **GET `/api/communities/recommendations`** → `/api/recommendations/communities`

### 5.7 Operational endpoints (recommended)

- **GET `/api/health`** (public): service health (Gateway aggregates)  
- **GET `/api/version`** (public): build/version info

