# NewCommunity Integration Checklist

Run these checks with authenticated user and backend data.

1. Open `newCommunity` from `communities` screen plus button.
2. Fill name/description/genre and save; verify `POST /api/communities` returns created community.
3. Pick a local cover image and save; verify image upload to `POST /api/images` happens before create call and resulting `coverUrl` is sent in create payload.
4. Verify successful creation navigates to `myCommunity` with created `communityId`.
5. Verify created community appears in "Созданные сообщества" strip and in subscribed communities (owner auto-membership).
6. Try submitting empty name and verify client-side validation blocks request.
