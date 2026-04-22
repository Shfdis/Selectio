# MyCommunity Integration Checklist

Run these checks with authenticated user and backend data.

1. Open `myCommunity` with a valid owned `communityId` route param.
2. Verify owner community header/details load from `GET /api/communities/{id}`.
3. Verify owner community posts load from `GET /api/communities/{id}/posts`.
4. Verify settings button opens `editCommunity`.
5. Verify "Создать пост" opens `newPost`.
6. Verify "Посмотреть предложку" opens `suggestedPosts`.
7. Re-open `myCommunity` from created communities strip and verify same backend-driven data is shown.
