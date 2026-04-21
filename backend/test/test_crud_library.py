#!/usr/bin/env python3

import requests


class TestCrudLibrary:
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

        # update status
        r = requests.put(
            f"{crud_base_url}/api/books/{book_id}/library",
            json={"status": "Reading"},
            headers=headers,
            timeout=5,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "Reading"

        # list user books
        r = requests.get(f"{crud_base_url}/api/users/{user_id}/books", timeout=5)
        assert r.status_code == 200
        items = r.json()
        assert any(i["bookId"] == book_id for i in items)

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

