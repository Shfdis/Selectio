# NewReview Integration Checklist

Run these checks with backend data and an authenticated user.

1. Open `newReview` from a `readBooks` row that has no user rating.
2. Verify selecting stars and confirming sends `PUT /api/books/{id}/rate` with selected rating.
3. Verify confirming also sends `POST /api/books/{id}/comments` with review text and rating.
4. Verify returning to `readBooks` shows updated rating badge for the same book.
5. Verify opening the same book in `Book` shows the new review in reviews list.
