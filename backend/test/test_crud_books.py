#!/usr/bin/env python3

import requests
import subprocess


class TestCrudBooks:
    @staticmethod
    def _seed_user_book(user_id: int, book_id: int, status: int, rating: int | None = None) -> None:
        rating_sql = "NULL" if rating is None else str(rating)
        cmd = [
            "docker", "exec", "selectio_postgres",
            "psql", "-U", "postgres", "-d", "selectio_main", "-c",
            f'INSERT INTO crud."UserBooks" ("UserId","BookId","Status","Rating") '
            f"VALUES ({user_id},{book_id},{status},{rating_sql}) "
            f'ON CONFLICT ("UserId","BookId") DO UPDATE SET "Status"=EXCLUDED."Status", "Rating"=EXCLUDED."Rating";'
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=True)

    @staticmethod
    def _cleanup_user_book(user_id: int, book_id: int) -> None:
        cmd = [
            "docker", "exec", "selectio_postgres",
            "psql", "-U", "postgres", "-d", "selectio_main", "-c",
            f'DELETE FROM crud."UserBooks" WHERE "UserId"={user_id} AND "BookId"={book_id};'
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=True)

    def test_list_books(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        first = data[0]
        for key in ["id", "title", "author", "description", "genre", "coverUrl"]:
            assert key in first

    def test_get_missing_book_returns_404(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books/99999999", timeout=5)
        assert response.status_code == 404

    def test_search_books(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books/search", params={"query": "hobbit"}, timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert any("hobbit" in b["title"].lower() for b in data)

    def test_get_book_by_id_includes_user_status_when_header_present(self, crud_base_url):
        user_id = 99901
        books = requests.get(f"{crud_base_url}/api/books", timeout=5).json()
        assert books
        book_id = books[0]["id"]
        self._seed_user_book(user_id, book_id, status=0)
        try:
            resp = requests.get(
                f"{crud_base_url}/api/books/{book_id}",
                headers={"X-User-Id": str(user_id)},
                timeout=5,
            )
            assert resp.status_code == 200
            payload = resp.json()
            assert payload["userStatus"] == "WantToRead"
            assert payload["userRating"] is None
        finally:
            self._cleanup_user_book(user_id, book_id)

    def test_search_includes_user_status_when_header_present(self, crud_base_url):
        user_id = 99902
        books = requests.get(f"{crud_base_url}/api/books/search", params={"query": "hobbit"}, timeout=5).json()
        assert books
        book_id = books[0]["id"]
        self._seed_user_book(user_id, book_id, status=1, rating=4)
        try:
            resp = requests.get(
                f"{crud_base_url}/api/books/search",
                params={"query": "hobbit"},
                headers={"X-User-Id": str(user_id)},
                timeout=5,
            )
            assert resp.status_code == 200
            data = resp.json()
            target = next((b for b in data if b["id"] == book_id), None)
            assert target is not None
            assert target["userStatus"] == "Reading"
            assert target["userRating"] == 4
        finally:
            self._cleanup_user_book(user_id, book_id)

    def test_list_includes_user_status_when_header_present(self, crud_base_url):
        user_id = 99904
        books = requests.get(f"{crud_base_url}/api/books", timeout=5).json()
        assert books
        book_id = books[0]["id"]
        self._seed_user_book(user_id, book_id, status=0, rating=3)
        try:
            resp = requests.get(
                f"{crud_base_url}/api/books",
                headers={"X-User-Id": str(user_id)},
                timeout=5,
            )
            assert resp.status_code == 200
            data = resp.json()
            target = next((b for b in data if b["id"] == book_id), None)
            assert target is not None
            assert target["userStatus"] == "WantToRead"
            assert target["userRating"] == 3
        finally:
            self._cleanup_user_book(user_id, book_id)

    def test_popular_includes_user_status_when_header_present(self, crud_base_url):
        user_id = 99903
        books = requests.get(f"{crud_base_url}/api/books/popular", timeout=5).json()
        assert books
        book_id = books[0]["id"]
        self._seed_user_book(user_id, book_id, status=2, rating=5)
        try:
            resp = requests.get(
                f"{crud_base_url}/api/books/popular",
                headers={"X-User-Id": str(user_id)},
                timeout=5,
            )
            assert resp.status_code == 200
            data = resp.json()
            target = next((b for b in data if b["id"] == book_id), None)
            assert target is not None
            assert target["userStatus"] == "Read"
            assert target["userRating"] == 5
        finally:
            self._cleanup_user_book(user_id, book_id)


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

