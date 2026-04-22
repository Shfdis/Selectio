# AllMyCreatedCommunities Integration Checklist

- [ ] Open `communities` tab and tap `Открыть все` in `Созданные сообщества`, verify navigation to `allMyCreatedCommunities`.
- [ ] Verify grid items are backend-driven (no mock list): data source is `/api/communities` filtered by `ownerUserId === currentUser.id`.
- [ ] Verify cards use backend cover URLs with placeholder fallback for missing cover.
- [ ] Tap multiple cards and verify navigation to `myCommunity` with correct `communityId`.
- [ ] Create a new community in `newCommunity`, return to `allMyCreatedCommunities`, and verify it appears in the grid.
- [ ] Delete one of your communities in `editCommunity`, return to `allMyCreatedCommunities`, and verify it disappears from the grid.
