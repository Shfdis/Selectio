# PostComments Integration Checklist

- [ ] Open any feed post (from `communities`, `community`, `myCommunity`, or `recommendations`) and tap comments icon to verify navigation to `postComments` with the correct `postId`.
- [ ] Verify comments load from `GET /api/posts/{id}/comments` and render username, date, and text from backend data.
- [ ] Verify loaded comments reflect backend like state (`likeCount`, `likedByCurrentUser`) from `GET /api/posts/{id}/comments`.
- [ ] Submit a non-empty comment and verify `POST /api/posts/{id}/comments` is called and the new comment appears in the thread.
- [ ] Edit your own comment, verify `PUT /api/comments/{id}` is called and updated text persists after reopening.
- [ ] Delete your own comment, verify `DELETE /api/comments/{id}` is called and comment is removed after reopening.
- [ ] Tap comment like and unlike, verify `POST/DELETE /api/comments/{id}/like` is called and UI count/state changes persist after reopening the screen.
- [ ] Verify send button is disabled for empty draft and enabled for non-empty draft.
- [ ] Verify empty-state text is shown when a post has no comments.
- [ ] Verify failed comment submission shows error alert and keeps draft text unchanged.
