# SuggestedPosts Integration Checklist

- [ ] Open `myCommunity`, tap `Посмотреть предложку`, and verify navigation to `suggestedPosts` with correct `communityId`.
- [ ] Verify suggested queue is loaded from `GET /api/communities/{id}/suggestions` (not mock data).
- [ ] Verify each queued card renders author, text, optional media, and linked book from backend fields.
- [ ] Tap `Выложить` and verify request goes to `POST /api/posts/{id}/approve`, item disappears from queue after refetch, and post appears in `myCommunity` published feed.
- [ ] Tap `Удалить` and verify request goes to `POST /api/posts/{id}/reject`, item disappears from queue after refetch.
- [ ] Reopen `suggestedPosts` and verify approve/reject changes persist across screen reload.
