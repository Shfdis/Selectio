# Search Screen Integration Checklist

Run these checks against a running backend and seeded data.

1. Open `main` -> `search` tab.
2. Verify "Рекомендованные" renders covers from `GET /api/books/recommended`.
3. Verify "Популярные" renders covers from `GET /api/books/popular`.
4. Verify "В тренде" renders from the popular feed fallback and opens `book` on tap.
5. Type a query in search input and confirm `GET /api/books/search?query=...` is called.
6. Confirm search results sheet shows backend results, not local mock entries.
7. Tap a result and verify navigation to `book` with `bookId` param.
8. Tap a genre card and verify navigation to `genre` with `genreName` param.
9. Search for random text and confirm empty-state "Ничего не найдено".
