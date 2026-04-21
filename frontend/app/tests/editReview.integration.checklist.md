# EditReview Integration Checklist

Run these checks with backend data and an authenticated user.

1. Open `editReview` from a `readBooks` row that already has a rating/review.
2. Verify changing stars and confirming sends `PUT /api/books/{id}/rate` with updated rating.
3. Verify changing review text and confirming sends `PUT /api/book-comments/{id}` when review exists.
4. Verify returning to `readBooks` shows updated rating and review preview state.
5. Verify opening the same book in `Book` shows updated review text/rating.
6. Verify tapping "Удалить отзыв" sends `DELETE /api/book-comments/{id}` and removes the review from `Profile` -> `Отзывы`.
