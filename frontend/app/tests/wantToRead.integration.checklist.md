# WantToRead Integration Checklist

Run these checks with backend data and an authenticated user.

1. Open `wantToRead` from `Profile` and verify books load from `GET /api/users/{id}/books` with status `WantToRead`.
2. Verify tapping a book row opens `Book` and passes `bookId`.
3. Verify sort options reorder the current list without breaking row actions.
4. Verify genre filter limits visible rows and can be reset by deselecting filters.
5. Verify "Переместить в «В процессе»" triggers `PUT /api/books/{id}/library` with status `InProgress` and removes the book from `wantToRead`.
6. Verify "Переместить в «Прочитанное»" triggers `PUT /api/books/{id}/library` with status `Read` and removes the book from `wantToRead`.
7. Verify "Удалить из списка" confirms and triggers `DELETE /api/books/{id}/library`, then removes the row from `wantToRead`.
8. Verify returning to `Profile` updates the `Хочу прочитать` count after move/delete actions.
