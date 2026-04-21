#!/usr/bin/env python3

import requests
import subprocess
import uuid as uuid_lib


class TestCrudBooks:
    @staticmethod
    def _seed_book_with_popularity(
        title: str,
        popularity: int,
        genre: str = "Fantasy",
        second_genre: str = "",
    ) -> None:
        esc_title = title.replace("'", "''")
        esc_genre = genre.replace("'", "''")
        esc_second_genre = second_genre.replace("'", "''")
        cmd = [
            "docker", "exec", "selectio_postgres",
            "psql", "-U", "postgres", "-d", "selectio_main", "-c",
            f"INSERT INTO crud.\"Books\" (\"Title\", \"Author\", \"Description\", \"Genre\", \"SecondGenre\", \"CoverUrl\", \"Popularity\") "
            f"VALUES ('{esc_title}', 'Popularity Test', '', '{esc_genre}', '{esc_second_genre}', '', {popularity});"
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

    def test_list_books(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        first = data[0]
        for key in ["id", "title", "author", "description", "genre", "secondGenre", "coverUrl", "releaseDate", "averageRating"]:
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
        for row in data:
            genre_text = f"{row.get('genre', '')} {row.get('secondGenre', '')}".lower()
            assert "fantasy" in genre_text

    def test_popular_by_genre_matches_second_genre_and_orders_by_popularity(self, crud_base_url):
        token = uuid_lib.uuid4().hex[:8]
        top_secondary = f"PopularitySecondGenre_{token}_TopSecondary"
        mid_primary = f"PopularitySecondGenre_{token}_MidPrimary"
        non_match = f"PopularitySecondGenre_{token}_NoMatch"
        titles = [top_secondary, mid_primary, non_match]

        self._seed_book_with_popularity(top_secondary, 2400, genre="Romance", second_genre="Fantasy")
        self._seed_book_with_popularity(mid_primary, 1600, genre="Fantasy", second_genre="Thriller")
        self._seed_book_with_popularity(non_match, 3200, genre="Biography", second_genre="History")

        try:
            response = requests.get(
                f"{crud_base_url}/api/books/popular-by-genre",
                params={"genre": "Fantasy", "page": 1, "pageSize": 20},
                timeout=5,
            )
            assert response.status_code == 200
            data = response.json()
            found = [b for b in data if b["title"] in titles]
            assert [b["title"] for b in found[:2]] == [top_secondary, mid_primary]
            assert all(b["title"] != non_match for b in data)
        finally:
            self._cleanup_seeded_titles(titles)

    def test_search_orders_by_popularity_desc_then_id(self, crud_base_url):
        token = uuid_lib.uuid4().hex[:8]
        low = f"PopularitySearch_{token}_Low"
        high = f"PopularitySearch_{token}_High"
        titles = [low, high]
        self._seed_book_with_popularity(low, 100)
        self._seed_book_with_popularity(high, 200)
        try:
            response = requests.get(
                f"{crud_base_url}/api/books/search",
                params={"query": f"PopularitySearch_{token}", "page": 1, "pageSize": 10},
                timeout=5,
            )
            assert response.status_code == 200
            data = response.json()
            found = [b for b in data if b["title"] in titles]
            assert [b["title"] for b in found][:2] == [high, low]
        finally:
            self._cleanup_seeded_titles(titles)

    def test_list_books_orders_by_popularity_desc_then_id(self, crud_base_url):
        token = uuid_lib.uuid4().hex[:8]
        lower = f"PopularityList_{token}_Lower"
        higher = f"PopularityList_{token}_Higher"
        titles = [lower, higher]
        self._seed_book_with_popularity(lower, 1200)
        self._seed_book_with_popularity(higher, 2200)
        try:
            response = requests.get(
                f"{crud_base_url}/api/books",
                params={"page": 1, "pageSize": 20},
                timeout=5,
            )
            assert response.status_code == 200
            data = response.json()
            found = [b for b in data if b["title"] in titles]
            assert [b["title"] for b in found][:2] == [higher, lower]
        finally:
            self._cleanup_seeded_titles(titles)

    def test_popular_and_popular_by_genre_use_persisted_popularity(self, crud_base_url):
        token = uuid_lib.uuid4().hex[:8]
        top = f"PopularityRank_{token}_Top"
        mid = f"PopularityRank_{token}_Mid"
        titles = [top, mid]
        self._seed_book_with_popularity(mid, 500, genre="Fantasy")
        self._seed_book_with_popularity(top, 1500, genre="Fantasy")
        try:
            popular = requests.get(
                f"{crud_base_url}/api/books/popular",
                params={"page": 1, "pageSize": 10},
                timeout=5,
            )
            assert popular.status_code == 200
            popular_data = [b for b in popular.json() if b["title"] in titles]
            assert [b["title"] for b in popular_data][:2] == [top, mid]

            by_genre = requests.get(
                f"{crud_base_url}/api/books/popular-by-genre",
                params={"genre": "Fantasy", "page": 1, "pageSize": 10},
                timeout=5,
            )
            assert by_genre.status_code == 200
            by_genre_data = [b for b in by_genre.json() if b["title"] in titles]
            assert [b["title"] for b in by_genre_data][:2] == [top, mid]
        finally:
            self._cleanup_seeded_titles(titles)

    def test_recommended_books_requires_user(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/api/books/recommended", timeout=5)
        assert response.status_code == 401

    def test_recommended_books_returns_list(self, crud_base_url):
        headers = {"X-User-Id": "6001"}
        response = requests.get(f"{crud_base_url}/api/books/recommended", headers=headers, timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_recommended_books_excludes_library_items_for_all_statuses(self, crud_base_url):
        user_id = 6002
        headers = {"X-User-Id": str(user_id)}

        books_resp = requests.get(
            f"{crud_base_url}/api/books",
            params={"page": 1, "pageSize": 10},
            timeout=5,
        )
        assert books_resp.status_code == 200
        books = books_resp.json()
        assert len(books) >= 1
        selected_ids = [int(b["id"]) for b in books[:3]]

        r1 = requests.post(
            f"{crud_base_url}/api/books/{selected_ids[0]}/library",
            headers=headers,
            json={"status": "WantToRead"},
            timeout=5,
        )
        assert r1.status_code == 200
        if len(selected_ids) > 1:
            r2 = requests.post(
                f"{crud_base_url}/api/books/{selected_ids[1]}/library",
                headers=headers,
                json={"status": "Reading"},
                timeout=5,
            )
            assert r2.status_code == 200
        if len(selected_ids) > 2:
            r3 = requests.post(
                f"{crud_base_url}/api/books/{selected_ids[2]}/library",
                headers=headers,
                json={"status": "Read"},
                timeout=5,
            )
            assert r3.status_code == 200

        rec_resp = requests.get(f"{crud_base_url}/api/books/recommended", headers=headers, timeout=5)
        assert rec_resp.status_code == 200
        rec_ids = {b["id"] for b in rec_resp.json()}
        assert rec_ids.isdisjoint(set(selected_ids))


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

