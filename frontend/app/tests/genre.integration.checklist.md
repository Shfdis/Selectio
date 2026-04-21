# Genre Integration Checklist

Run these checks with backend data.

1. Open `Genre` from `Search` with a `genreName` param.
2. Verify grid loads from `GET /api/books/popular-by-genre?genre=...`.
3. Verify selected genre matches either `genre` or `secondGenre` in returned book payloads.
4. Verify tapping a cover opens `book` with `bookId`.
5. Scroll to bottom and verify next page is requested and appended.
6. Verify loading spinner appears while next genre page is fetching.
7. Verify pagination stops when API returns less than page size.
