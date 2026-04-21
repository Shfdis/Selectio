# InProgress Integration Checklist

Run these checks with backend data and an authenticated user.

1. Open `inProgress` from `Profile` and verify books load from `GET /api/users/{id}/books` with status `InProgress`.
2. Verify tapping a book row opens `Book` and passes `bookId`.
3. Verify sort options reorder the current list without breaking row actions.
4. Verify genre filter limits visible rows and can be reset by deselecting filters.
5. Verify "Переместить в «Хочу прочитать»" triggers `PUT /api/books/{id}/library` with status `WantToRead` and removes the book from `inProgress`.
6. Verify "Переместить в «Прочитанное»" triggers `PUT /api/books/{id}/library` with status `Read` and removes the book from `inProgress`.
7. Verify "Удалить из списка" confirms and triggers `DELETE /api/books/{id}/library`, then removes the row from `inProgress`.
8. Verify returning to `Profile` updates the `В процессе` count after move/delete actions.
