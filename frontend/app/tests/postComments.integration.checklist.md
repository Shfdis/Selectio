# PostComments Integration Checklist

- [ ] Open any feed post (from `communities`, `community`, `myCommunity`, or `recommendations`) and tap comments icon to verify navigation to `postComments` with the correct `postId`.
- [ ] Verify comments load from `GET /api/posts/{id}/comments` and render username, date, and text from backend data.
- [ ] Submit a non-empty comment and verify `POST /api/posts/{id}/comments` is called and the new comment appears in the thread.
- [ ] Verify send button is disabled for empty draft and enabled for non-empty draft.
- [ ] Verify empty-state text is shown when a post has no comments.
- [ ] Verify failed comment submission shows error alert and keeps draft text unchanged.
