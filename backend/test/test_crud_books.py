#!/usr/bin/env python3

import requests
import subprocess


class TestCrudBooks:
    @staticmethod
    def _seed_book(title: str, genre: str, second_genre: str, popularity: int) -> None:
        esc_title = title.replace("'", "''")
        esc_genre = genre.replace("'", "''")
        esc_second = second_genre.replace("'", "''")
        cmd = [
            "docker", "exec", "selectio_postgres",
            "psql", "-U", "postgres", "-d", "selectio_main", "-c",
            f"INSERT INTO crud.\"Books\" (\"Title\",\"Author\",\"Description\",\"Genre\",\"SecondGenre\",\"CoverUrl\",\"Popularity\") "
            f"VALUES ('{esc_title}','Seed Author','','{esc_genre}','{esc_second}','',{popularity});"
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=True)

    @staticmethod
    def _cleanup_seeded_titles(titles: list[str]) -> None:
        escaped = ", ".join("'" + t.replace("'", "''") + "'" for t in titles)
        cmd = [
            "docker", "exec", "selectio_postgres",
            "psql", "-U", "postgres", "-d", "selectio_main", "-c",
            f"DELETE FROM crud.\"Books\" WHERE \"Title\" IN ({escaped});"
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=True)

    @staticmethod
    def _seed_user_book(user_id: int, book_id: int, status: int) -> None:
        cmd = [
            "docker", "exec", "selectio_postgres",
            "psql", "-U", "postgres", "-d", "selectio_main", "-c",
            f'INSERT INTO crud."UserBooks" ("UserId","BookId","Status") '
            f"VALUES ({user_id},{book_id},{status}) "
            f'ON CONFLICT ("UserId","BookId") DO UPDATE SET "Status"=EXCLUDED."Status";'
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
        finally:
            self._cleanup_user_book(user_id, book_id)

    def test_search_includes_user_status_when_header_present(self, crud_base_url):
        user_id = 99902
        books = requests.get(f"{crud_base_url}/api/books/search", params={"query": "hobbit"}, timeout=5).json()
        assert books
        book_id = books[0]["id"]
        self._seed_user_book(user_id, book_id, status=1)
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
        finally:
            self._cleanup_user_book(user_id, book_id)

    def test_list_includes_user_status_when_header_present(self, crud_base_url):
        user_id = 99904
        books = requests.get(f"{crud_base_url}/api/books", timeout=5).json()
        assert books
        book_id = books[0]["id"]
        self._seed_user_book(user_id, book_id, status=0)
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
        finally:
            self._cleanup_user_book(user_id, book_id)

    def test_popular_includes_user_status_when_header_present(self, crud_base_url):
        user_id = 99903
        books = requests.get(f"{crud_base_url}/api/books/popular", timeout=5).json()
        assert books
        book_id = books[0]["id"]
        self._seed_user_book(user_id, book_id, status=2)
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
        finally:
            self._cleanup_user_book(user_id, book_id)

    def test_popular_by_genre_matches_genre_or_second_genre(self, crud_base_url):
        top = "GenreSeedTop"
        second = "GenreSeedSecond"
        titles = [top, second]
        self._seed_book(top, "Fantasy", "Romance", 9000)
        self._seed_book(second, "History", "Fantasy", 8000)
        try:
            resp = requests.get(
                f"{crud_base_url}/api/books/popular-by-genre",
                params={"genre": "fantasy", "pageSize": 20},
                timeout=5,
            )
            assert resp.status_code == 200
            data = resp.json()
            found = [b["title"] for b in data if b["title"] in titles]
            assert top in found
            assert second in found
        finally:
            self._cleanup_seeded_titles(titles)

    def test_recommended_books_requires_user(self, crud_base_url):
        resp = requests.get(f"{crud_base_url}/api/books/recommended", timeout=5)
        assert resp.status_code == 401

    def test_recommended_books_returns_list_for_user(self, crud_base_url):
        resp = requests.get(
            f"{crud_base_url}/api/books/recommended",
            headers={"X-User-Id": "6001"},
            timeout=5,
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

