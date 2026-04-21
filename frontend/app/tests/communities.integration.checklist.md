# Communities Integration Checklist

Run these checks with authenticated user and backend data.

1. Open `main` -> `groups` tab (`Communities`).
2. Verify "Мои подписки" strip loads from `GET /api/users/{id}/communities`.
3. Verify "Созданные сообщества" strip is derived from `GET /api/communities` filtered by `ownerUserId`.
4. Verify communities feed renders from `GET /api/users/me/feed`.
5. Enter a query and verify search results are loaded from `GET /api/communities?query=...`.
6. Tap a search result and verify navigation to `community`/`myCommunity` with `communityId`.
7. Tap subscription and created-community cover cards and verify route params include `communityId`.
8. Tap feed post comments icon and verify navigation to `postComments`.
