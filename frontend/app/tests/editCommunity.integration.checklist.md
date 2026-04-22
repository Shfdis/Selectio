# EditCommunity Integration Checklist

- [ ] Open `myCommunity`, tap settings, and verify `editCommunity` loads the current community name/description/genre/cover from `GET /api/communities/{id}`.
- [ ] Change only text fields (name/description), save, reopen community, and verify changes persist from backend data.
- [ ] Change genre selection, save, reopen community, and verify selected primary genre persists.
- [ ] Pick a local cover image, save, and verify upload request to `POST /api/images` is sent before `PUT /api/communities/{id}`.
- [ ] After cover update, reopen `myCommunity` and verify the updated cover URL is rendered from backend response.
- [ ] Verify failed save/upload shows error alert and does not navigate away silently.
