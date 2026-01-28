#!/usr/bin/env python3

import requests
import uuid


class TestCrudComments:
    def _get_first_book_id(self, crud_base_url: str) -> int:
        r = requests.get(f"{crud_base_url}/api/books", timeout=5)
        r.raise_for_status()
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        return int(data[0]["id"])

    def _create_community(self, crud_base_url: str, owner_id: int) -> int:
        headers = {"X-User-Id": str(owner_id)}
        name = f"comments_{uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{crud_base_url}/api/communities",
            json={"name": name, "description": ""},
            headers=headers,
            timeout=5,
        )
        r.raise_for_status()
        return int(r.json()["id"])

    def _create_post(self, crud_base_url: str, author_id: int, community_id: int, book_id: int) -> int:
        headers = {"X-User-Id": str(author_id)}
        r = requests.post(
            f"{crud_base_url}/api/posts",
            json={"communityId": community_id, "bookId": book_id, "content": "Post for comments"},
            headers=headers,
            timeout=5,
        )
        r.raise_for_status()
        return int(r.json()["id"])

    def test_post_comments_add_list_edit_delete(self, crud_base_url):
        author_id = 5001
        headers = {"X-User-Id": str(author_id)}
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=author_id)
        post_id = self._create_post(crud_base_url, author_id=author_id, community_id=community_id, book_id=book_id)

        # add
        r = requests.post(
            f"{crud_base_url}/api/posts/{post_id}/comments",
            json={"content": "First!"},
            headers=headers,
            timeout=5,
        )
        assert r.status_code == 200
        comment = r.json()
        comment_id = comment["id"]
        assert comment["postId"] == post_id

        # list
        r2 = requests.get(f"{crud_base_url}/api/posts/{post_id}/comments", timeout=5)
        assert r2.status_code == 200
        items = r2.json()
        assert any(c["id"] == comment_id for c in items)

        # edit
        r3 = requests.put(f"{crud_base_url}/api/comments/{comment_id}", json={"content": "Edited"}, headers=headers, timeout=5)
        assert r3.status_code == 200
        assert r3.json()["content"] == "Edited"

        # delete
        r4 = requests.delete(f"{crud_base_url}/api/comments/{comment_id}", headers=headers, timeout=5)
        assert r4.status_code == 200

        # list should not include
        r5 = requests.get(f"{crud_base_url}/api/posts/{post_id}/comments", timeout=5)
        assert r5.status_code == 200
        items2 = r5.json()
        assert all(c["id"] != comment_id for c in items2)

    def test_book_comments_add_list_and_rating_validation(self, crud_base_url):
        user_id = 6001
        headers = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)

        # invalid rating
        r_bad = requests.post(
            f"{crud_base_url}/api/books/{book_id}/comments",
            json={"content": "Bad rating", "rating": 0},
            headers=headers,
            timeout=5,
        )
        assert r_bad.status_code == 400

        # add
        r = requests.post(
            f"{crud_base_url}/api/books/{book_id}/comments",
            json={"content": "Great book", "rating": 5},
            headers=headers,
            timeout=5,
        )
        assert r.status_code == 200
        comment_id = r.json()["id"]

        # list
        r2 = requests.get(f"{crud_base_url}/api/books/{book_id}/comments", timeout=5)
        assert r2.status_code == 200
        items = r2.json()
        assert any(c["id"] == comment_id for c in items)


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

