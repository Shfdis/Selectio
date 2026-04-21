# Book Integration Checklist

Run these checks with backend data and authenticated user.

1. Open a book from `Search` or `Recommendations` and verify route passes `bookId`.
2. Verify `Book` page loads details from `GET /api/books/{id}`.
3. Verify reviews list loads from `GET /api/books/{id}/comments`.
4. Verify "Добавить в библиотеку" opens shelf sheet and creates membership via `POST /api/books/{id}/library`.
5. Verify "Переместить" updates shelf via `PUT /api/books/{id}/library`.
6. Verify "Удалить из списка" removes membership via `DELETE /api/books/{id}/library`.
7. Verify UI shelf badge/state reflects backend `userStatus` after each mutation.
8. Verify navigating back and reopening the same book preserves server-backed shelf state.
