# Recommendations Integration Checklist

Run these checks against backend with real data.

1. Open `main` -> `home` tab (`Recommendations`).
2. Verify recommended books rail loads from `GET /api/books/recommended`.
3. Verify feed posts load from `GET /api/posts/recommended`.
4. Verify posts feed renders only post cards (no standalone book rows in feed).
6. Tap a recommended book rail item and verify navigation to `book` with `bookId`.
7. Tap a feed post comments icon and verify navigation to `postComments`.
8. Scroll to the bottom of recommendations and verify another books page is loaded and appended in the top rail data source.
9. If feed payload includes author avatar URL, verify post card avatar renders remote image (otherwise placeholder icon is shown).
