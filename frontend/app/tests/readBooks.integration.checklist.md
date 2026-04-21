# ReadBooks Integration Checklist

Run these checks with backend data and an authenticated user.

1. Open `readBooks` from `Profile` and verify books load from `GET /api/users/{id}/books` with status `Read`.
2. Verify tapping a book row opens `Book` and passes `bookId`.
3. Verify API `rating` values are rendered in row rating badges when present.
4. Verify sort options reorder the current list without breaking row actions.
5. Verify genre filter limits visible rows and can be reset by deselecting filters.
6. Verify "Переместить в «Хочу прочитать»" triggers `PUT /api/books/{id}/library` with status `WantToRead` and removes the book from `readBooks`.
7. Verify "Переместить в «В процессе»" triggers `PUT /api/books/{id}/library` with status `InProgress` and removes the book from `readBooks`.
8. Verify "Удалить из списка" confirms and triggers `DELETE /api/books/{id}/library`, then removes the row from `readBooks`.
9. Verify returning to `Profile` updates the `Прочитанное` count after move/delete actions.
10. Verify adding/editing a review still updates the local `ReadBooks` UI (known gap: not yet persisted to backend).
