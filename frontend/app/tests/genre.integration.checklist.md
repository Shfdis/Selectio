# Genre Integration Checklist

Run these checks with backend data.

1. Open `Genre` from `Search` with a `genreName` param.
2. Verify grid loads from `GET /api/books/popular-by-genre?genre=...`.
3. Verify tapping a cover opens `book` with `bookId`.
4. Scroll to bottom and verify next page is requested and appended.
5. Verify loading spinner appears while next genre page is fetching.
6. Verify pagination stops when API returns less than page size.
