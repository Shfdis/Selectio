# Community Integration Checklist

Run these checks with authenticated user and backend data.

1. Open `community` with a valid `communityId` route param.
2. Verify community header/details load from `GET /api/communities/{id}`.
3. Verify posts list loads from `GET /api/communities/{id}/posts`.
4. Verify tapping "Подписаться" triggers `POST /api/communities/{id}/join` and button state switches to subscribed actions.
5. Verify tapping "Отписаться" triggers `POST /api/communities/{id}/leave` and button state switches back to subscribe.
6. Verify tapping "Предложить пост" opens `newPost`.
7. Verify post cards in this screen open `postComments` from comment action.
