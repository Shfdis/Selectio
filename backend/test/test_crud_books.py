#!/usr/bin/env python3

import requests


class TestCrudBooks:
    def test_list_books(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        first = data[0]
        for key in ["id", "title", "author", "description", "genre", "coverUrl", "releaseDate", "averageRating"]:
            assert key in first

    def test_get_missing_book_returns_404(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books/99999999", timeout=5)
        assert response.status_code == 404

    def test_get_book_by_id_includes_release_date_and_average_rating(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books", timeout=5)
        assert response.status_code == 200
        books = response.json()
        assert len(books) > 0
        book_id = books[0]["id"]
        r = requests.get(f"{crud_base_url}/api/books/{book_id}", timeout=5)
        assert r.status_code == 200
        b = r.json()
        assert "releaseDate" in b
        assert "averageRating" in b
        assert "userStatus" in b
        assert "userRating" in b

    def test_search_books(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books/search", params={"query": "hobbit"}, timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert any("hobbit" in b["title"].lower() for b in data)

    def test_popular_by_genre(self, crud_base_url):
        response = requests.get(
            f"{crud_base_url}/api/books/popular-by-genre",
            params={"genre": "Fantasy", "page": 1, "pageSize": 5},
            timeout=5,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_recommended_books_requires_user(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books/recommended", timeout=5)
        assert response.status_code == 401

    def test_recommended_books_returns_list(self, crud_base_url):
        headers = {"X-User-Id": "6001"}
        response = requests.get(f"{crud_base_url}/api/books/recommended", headers=headers, timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

