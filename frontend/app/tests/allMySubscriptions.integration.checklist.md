# AllMySubscriptions Integration Checklist

- [ ] Open `communities` tab and tap `Открыть все` in `Мои подписки`, verify navigation to `allMySubscriptions`.
- [ ] Verify grid items are loaded from `GET /api/users/{id}/communities` (not mock data).
- [ ] Verify cards use backend cover URLs with placeholder fallback for missing cover.
- [ ] Tap multiple cards and verify navigation to `community` with correct `communityId`.
- [ ] Join a new community, reopen `allMySubscriptions`, and verify it appears in the grid.
- [ ] Leave a community, reopen `allMySubscriptions`, and verify it disappears from the grid.
