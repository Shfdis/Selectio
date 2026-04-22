# Frontend Screens - Backend Integration Plan

This order is optimized to replace mock data safely while keeping user flows working end-to-end.

## Screens in implementation order

1. `Home` (`home`) - **Status: Implemented**
   - Already implemented: auth-gate flow using current-user query and navigation decision.
   - To implement: explicit backend error/empty-state UX.

2. `Login` (`login`) - **Status: Implemented**
   - Already implemented: real login mutation and post-auth navigation.
   - To implement: stronger field validation and loading/disabled UX polish.

3. `Register` (`register`) - **Status: Implemented**
   - Already implemented: real register mutation and backend error handling.
   - To implement: post-register auto-login/session handoff.

4. `MainScreen` (`main`) - **Status: Partially implemented**
   - Already implemented: authenticated shell and tab host behavior.
   - To implement: no direct data layer; depends on tab integrations below.

5. `Profile` (tab inside `main`) - **Status: Implemented**
   - Already implemented: current profile identity/bio/avatar, library counts by status, "my reviews", and "favorites" are loaded from backend queries.
   - To implement: optional UX polish for favorites cards (enrich post details) and loading/error states per tab.

6. `Search` (tab inside `main`) - **Status: Implemented**
   - Already implemented: discovery rails and live search are backed by `/api/books/recommended`, `/api/books/popular`, and `/api/books/search`.
   - To implement: add pagination/infinite-scroll and dedicated trending source when backend endpoint is available.

7. `Recommendations` (tab inside `main`) - **Status: Implemented**
   - Already implemented: recommended books (`/api/books/recommended`) are shown in the top books rail and recommended posts (`/api/posts/recommended`) are shown in the feed; post cards render backend author avatar when present.
   - To implement: optional dedicated pagination UX for the top books rail.

8. `Communities` (tab inside `main`) - **Status: Implemented**
   - Already implemented: subscriptions strip, created-communities strip, communities search, and feed are wired to backend endpoints; feed post cards render backend author avatar when present.
   - To implement: optional server endpoints for direct "my created communities" list (currently derived from `/api/communities` by `ownerUserId`).

9. `Book` (`book`) - **Status: Implemented**
   - Already implemented: book detail (`/api/books/{id}`), reviews (`/api/books/{id}/comments`), and library add/move/remove actions (`/api/books/{id}/library`) are backend-backed; current-user reviews render saved profile avatar URL.
   - To implement: optional inline error toasts/loading states for mutation failures.

10. `Genre` (`genre`) - **Status: Implemented**
    - Already implemented: books-by-genre grid uses `/api/books/popular-by-genre` with pagination and opens `Book` by `bookId`.
    - To implement: optional empty-state copy and retry CTA for no-results/error cases.

11. `WantToRead` (`wantToRead`) - **Status: Implemented**
    - Already implemented: shelf list is loaded from `/api/users/{id}/books?status=WantToRead`, and move/delete actions are persisted via `PUT/DELETE /api/books/{id}/library`.
    - To implement: optional pagination for very large shelves and mutation error toasts.

12. `InProgress` (`inProgress`) - **Status: Implemented**
    - Already implemented: shelf list is loaded from `/api/users/{id}/books?status=InProgress`, and move/delete actions are persisted via `PUT/DELETE /api/books/{id}/library`.
    - To implement: optional pagination for very large shelves and mutation error toasts.

13. `ReadBooks` (`readBooks`) - **Status: Implemented**
    - Already implemented: read shelf list is loaded from `/api/users/{id}/books?status=Read`, move/delete actions are persisted via `PUT/DELETE /api/books/{id}/library`, and rating/review edit entry points are resolved from backend data.
    - To implement: optional dedicated pagination for large read shelves.

14. `NewReview` (`newReview`) - **Status: Implemented**
    - Already implemented: review form submits rating and review text via `POST /api/books/{id}/comments`.
    - To implement: optional inline validation/error messaging.

15. `EditReview` (`editReview`) - **Status: Implemented**
    - Already implemented: edit-review form updates existing review via `PUT /api/book-comments/{id}` and supports delete via `DELETE /api/book-comments/{id}`.
    - To implement: optional inline error toasts for mutation failures.

16. `EditProfile` (`editProfile`) - **Status: Implemented**
    - Already implemented: profile fetch/update, and avatar upload pipeline via `POST /api/images` + `PUT /api/users/profile`.
    - To implement: optional field validation and per-field inline error messaging.

17. `AllMySubscriptions` (`allMySubscriptions`) - **Status: Mocked**
    - Already implemented: subscribed-community grid UI.
    - To implement: backend list query for subscribed communities.

18. `AllMyCreatedCommunities` (`allMyCreatedCommunities`) - **Status: Mocked**
    - Already implemented: created-community grid UI.
    - To implement: backend list query for user-created communities.

19. `Community` (`community`) - **Status: Mocked**
    - Already implemented: community header/feed UI and local subscribe toggle.
    - To implement: community detail/posts queries and subscribe/unsubscribe mutation.

20. `MyCommunity` (`myCommunity`) - **Status: Mocked**
    - Already implemented: owner community UI and moderation navigation points.
    - To implement: owner-specific community data and privileged actions from backend.

21. `NewCommunity` (`newCommunity`) - **Status: Stubbed**
    - Already implemented: create form UX and image selection.
    - To implement: create-community mutation and submit success/error handling.

22. `EditCommunity` (`editCommunity`) - **Status: Mocked**
    - Already implemented: edit form UX with local prefill.
    - To implement: community fetch + update mutation.

23. `NewPost` (`newPost`) - **Status: Stubbed**
    - Already implemented: post composer UI and media picker.
    - To implement: create-post mutation and optimistic refresh strategy.

24. `PostComments` (`postComments`) - **Status: Mocked**
    - Already implemented: comments thread UI, input, and local like state.
    - To implement: comments query, add-comment mutation, and comment-like mutation.

25. `SuggestedPosts` (`suggestedPosts`) - **Status: Mocked**
    - Already implemented: moderation queue UI with local publish/delete actions.
    - To implement: suggested-posts queue query and moderation mutations.

## Required integration tests

1. **Auth bootstrap and routing**
   - Unauthenticated launch stays on `home` and can open `login`/`register`.
   - Successful login/register lands user in `main`.
   - Expired token (`401`) clears session and returns to auth flow.

2. **Main tab data loading**
   - `profile`, `search`, `home` (recommendations), and `groups` tabs each trigger their backend query and render non-mock data.
   - Recommendations feed validates mixed book/post rendering with 50/50 random interleaving policy.
   - Communities tab validates subscriptions, owned communities strip, search, and feed endpoints.

3. **Book and search flow**
   - `Search` result -> `Book` opens correct book detail from API.
   - `Genre` -> book list pagination works and item opens `Book`.
   - `genre`/`secondGenre` backend fields are mapped to UI genre chips/cards consistently.
   - Full manual checklist: `app/tests/search.integration.checklist.md`.
   - Full manual checklist for `Book`: `app/tests/book.integration.checklist.md`.
   - Full manual checklist for `Genre`: `app/tests/genre.integration.checklist.md`.

4. **Recommendations mixed feed**
   - `Recommendations` loads books from `/api/books/recommended` for the books rail and posts from `/api/posts/recommended` for the feed.
   - Feed contains post cards only (no standalone book rows).
   - Reaching the bottom loads and appends the next books page for recommendations.
   - Full manual checklist: `app/tests/recommendations.integration.checklist.md`.

5. **Communities tab integration**
   - `Communities` loads subscriptions via `/api/users/{id}/communities`, discover/search via `/api/communities`, and feed via `/api/users/me/feed`.
   - Cover cards and search results navigate with `communityId` route params.
   - Full manual checklist: `app/tests/communities.integration.checklist.md`.

6. **Library shelf lifecycle**
   - `wantToRead` screen loads from backend (`/api/users/{id}/books` with status filter), supports move/delete via `/api/books/{id}/library`, and opens `Book` with valid `bookId`.
   - `inProgress` screen loads from backend (`/api/users/{id}/books` with status filter), supports move/delete via `/api/books/{id}/library`, and opens `Book` with valid `bookId`.
   - `readBooks` screen loads from backend (`/api/users/{id}/books` with status filter), supports move/delete via `/api/books/{id}/library`, and shows API `rating`.
   - Add/move/remove book across `wantToRead`, `inProgress`, `readBooks` persists server-side and survives app reload.
   - Full manual checklist for `WantToRead`: `app/tests/wantToRead.integration.checklist.md`.
   - Full manual checklist for `InProgress`: `app/tests/inProgress.integration.checklist.md`.
   - Full manual checklist for `ReadBooks`: `app/tests/readBooks.integration.checklist.md`.

7. **Review lifecycle**
   - Create review from `newReview` persists via `POST /api/books/{id}/comments`.
   - Edit review from `editReview` persists edited text/rating via `PUT /api/book-comments/{id}`.
   - Delete review from `editReview` persists via `DELETE /api/book-comments/{id}`.
   - Verify updated review appears on both `readBooks` and `Book`.
   - Full manual checklist for `NewReview`: `app/tests/newReview.integration.checklist.md`.
   - Full manual checklist for `EditReview`: `app/tests/editReview.integration.checklist.md`.

8. **Profile updates**
   - `editProfile` save persists and re-renders in `Profile`.
   - `editProfile` avatar change uploads media to `/api/images` and persists returned URL in profile.
   - Updated avatar is rendered in `Profile` header and in current-user review/post surfaces with placeholder fallback for users without avatar URL.
   - `Profile` tabs (`books`, `reviews`, `favorites`) load from `/api/users/{id}/books`, `/api/users/me/book-comments`, and `/api/users/favorites` without mock data.
   - Full manual checklist for `EditProfile`: `app/tests/editProfile.integration.checklist.md`.

9. **Community lifecycle**
   - Create community (`newCommunity`), edit (`editCommunity`), and verify it appears in `allMyCreatedCommunities` and `myCommunity`.

10. **Subscriptions and community lists**
   - Subscribe/unsubscribe in `community` updates `allMySubscriptions` and `communities` tab sections.

11. **Post and comment lifecycle**
   - Create post (`newPost`) appears in `community`/`myCommunity` feed.
   - Open `postComments`, add comment, and verify persisted comments/like state.

12. **Moderation flow**
   - `suggestedPosts` publish/delete mutations update queue and downstream community feed correctly.

## Notes

- Stack route names are taken from `app/App.js`.
- `Profile`, `Search`, `Recommendations`, and `Communities` are rendered inside `MainScreen`.
- Public screens: `Home`, `Login`, `Register`. All others are in authenticated flows.
