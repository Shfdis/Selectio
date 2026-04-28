#!/usr/bin/env python3

from datetime import datetime

import requests


class TestCrudLibrary:
    @staticmethod
    def _parse_utc(ts: str) -> datetime:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))

    def _get_first_book_id(self, crud_base_url: str) -> int:
        r = requests.get(f"{crud_base_url}/api/books", timeout=5)
        r.raise_for_status()
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        return int(data[0]["id"])

    def test_library_flow_add_update_list_remove(self, crud_base_url):
        user_id = 123
        headers = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)

        # add
        r = requests.post(f"{crud_base_url}/api/books/{book_id}/library", json={"status": "WantToRead"}, headers=headers, timeout=5)
        assert r.status_code == 200
        added = r.json()
        assert "addedAt" in added
        initial_added_at = added["addedAt"]

        # update status
        r = requests.put(
            f"{crud_base_url}/api/books/{book_id}/library",
            json={"status": "Reading"},
            headers=headers,
            timeout=5,
        )
        assert r.status_code == 200
        updated = r.json()
        assert updated["status"] == "Reading"
        assert "addedAt" in updated
        updated_dt = self._parse_utc(updated["addedAt"])
        initial_dt = self._parse_utc(initial_added_at)
        assert abs((updated_dt - initial_dt).total_seconds()) < 1

        # list user books
        r = requests.get(f"{crud_base_url}/api/users/{user_id}/books", timeout=5)
        assert r.status_code == 200
        items = r.json()
        assert any(i["bookId"] == book_id for i in items)
        found = next(i for i in items if i["bookId"] == book_id)
        assert "addedAt" in found
        assert "secondGenre" in found
        found_dt = self._parse_utc(found["addedAt"])
        assert abs((found_dt - initial_dt).total_seconds()) < 1

        # list filtered by status
        r = requests.get(f"{crud_base_url}/api/users/{user_id}/books", params={"status": "Reading"}, timeout=5)
        assert r.status_code == 200
        items = r.json()
        assert any(i["bookId"] == book_id for i in items)

        # remove
        r = requests.delete(f"{crud_base_url}/api/books/{book_id}/library", headers=headers, timeout=5)
        assert r.status_code == 200

        # verify removed
        r = requests.get(f"{crud_base_url}/api/users/{user_id}/books", timeout=5)
        assert r.status_code == 200
        items = r.json()
        assert all(i["bookId"] != book_id for i in items)

    def test_library_requires_user_header(self, crud_base_url):
        book_id = self._get_first_book_id(crud_base_url)
        r = requests.post(f"{crud_base_url}/api/books/{book_id}/library", timeout=5)
        assert r.status_code == 401

if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

