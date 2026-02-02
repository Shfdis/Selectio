#!/usr/bin/env python3

import requests
import uuid


class TestCrudPosts:
    def _get_first_book_id(self, crud_base_url: str) -> int:
        r = requests.get(f"{crud_base_url}/api/books", timeout=5)
        r.raise_for_status()
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        return int(data[0]["id"])

    def _create_community(self, crud_base_url: str, owner_id: int) -> int:
        headers = {"X-User-Id": str(owner_id)}
        name = f"posts_{uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{crud_base_url}/api/communities",
            json={"name": name, "description": ""},
            headers=headers,
            timeout=5,
        )
        r.raise_for_status()
        return int(r.json()["id"])

    def test_create_get_feed_edit_delete(self, crud_base_url):
        author_id = 3001
        author_headers = {"X-User-Id": str(author_id)}
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=author_id)

        # create published
        r = requests.post(
            f"{crud_base_url}/api/posts",
            json={"communityId": community_id, "bookId": book_id, "content": "Hello world"},
            headers=author_headers,
            timeout=5,
        )
        assert r.status_code == 200
        post = r.json()
        post_id = post["id"]
        assert post["status"] == "Published"

        # get
        r2 = requests.get(f"{crud_base_url}/api/posts/{post_id}", timeout=5)
        assert r2.status_code == 200

        # feed includes post
        r3 = requests.get(f"{crud_base_url}/api/communities/{community_id}/posts", timeout=5)
        assert r3.status_code == 200
        feed = r3.json()
        assert any(p["id"] == post_id for p in feed)

        # edit
        r4 = requests.put(
            f"{crud_base_url}/api/posts/{post_id}",
            json={"content": "Updated"},
            headers=author_headers,
            timeout=5,
        )
        assert r4.status_code == 200
        assert r4.json()["content"] == "Updated"

        # delete
        r5 = requests.delete(f"{crud_base_url}/api/posts/{post_id}", headers=author_headers, timeout=5)
        assert r5.status_code == 200

        # get missing
        r6 = requests.get(f"{crud_base_url}/api/posts/{post_id}", timeout=5)
        assert r6.status_code == 404

    def test_suggested_post_not_in_feed(self, crud_base_url):
        author_id = 4001
        author_headers = {"X-User-Id": str(author_id)}
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=author_id)

        r = requests.post(
            f"{crud_base_url}/api/posts/suggest",
            json={"communityId": community_id, "bookId": book_id, "content": "Suggestion"},
            headers=author_headers,
            timeout=5,
        )
        assert r.status_code == 200
        post_id = r.json()["id"]

        # suggested is not directly visible without gateway allow header
        r0 = requests.get(f"{crud_base_url}/api/posts/{post_id}", timeout=5)
        assert r0.status_code == 404

        r0b = requests.get(f"{crud_base_url}/api/posts/{post_id}", headers={"X-Allow-Suggested": "true"}, timeout=5)
        assert r0b.status_code == 200
        assert r0b.json()["status"] == "Suggested"

        feed = requests.get(f"{crud_base_url}/api/communities/{community_id}/posts", timeout=5).json()
        assert all(p["id"] != post_id for p in feed)


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

