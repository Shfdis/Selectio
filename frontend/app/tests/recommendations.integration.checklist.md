# Recommendations Integration Checklist

Run these checks against backend with real data.

1. Open `main` -> `home` tab (`Recommendations`).
2. Verify recommended books rail loads from `GET /api/books/recommended`.
3. Verify feed posts load from `GET /api/posts/recommended`.
4. Verify mixed feed renders both item types (book rows and post cards) when both endpoints return data.
5. Verify interleaving uses a per-item 50/50 chance while both pools still contain items.
6. Tap a recommended book rail item and verify navigation to `book` with `bookId`.
7. Tap a mixed feed book item and verify navigation to `book` with `bookId`.
8. Tap a mixed feed post comments icon and verify navigation to `postComments`.
9. Scroll to the bottom of recommendations and verify another books page is loaded and appended.
