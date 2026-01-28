#!/usr/bin/env python3

import requests
import uuid


class TestCrudLikesFavorites:
    def _get_first_book_id(self, crud_base_url: str) -> int:
        r = requests.get(f"{crud_base_url}/api/books", timeout=5)
        r.raise_for_status()
        return int(r.json()[0]["id"])

    def _create_community(self, crud_base_url: str, owner_id: int) -> int:
        headers = {"X-User-Id": str(owner_id)}
        name = f"lf_{uuid.uuid4().hex[:8]}"
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
            json={"communityId": community_id, "bookId": book_id, "content": "Post for likes/favs"},
            headers=headers,
            timeout=5,
        )
        r.raise_for_status()
        return int(r.json()["id"])

    def test_like_unlike_idempotency(self, crud_base_url):
        user_id = 7001
        headers = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=user_id)
        post_id = self._create_post(crud_base_url, author_id=user_id, community_id=community_id, book_id=book_id)

        # like twice should not error
        r1 = requests.post(f"{crud_base_url}/api/posts/{post_id}/like", headers=headers, timeout=5)
        assert r1.status_code == 200
        r2 = requests.post(f"{crud_base_url}/api/posts/{post_id}/like", headers=headers, timeout=5)
        assert r2.status_code == 200

        # unlike twice should not error
        r3 = requests.delete(f"{crud_base_url}/api/posts/{post_id}/like", headers=headers, timeout=5)
        assert r3.status_code == 200
        r4 = requests.delete(f"{crud_base_url}/api/posts/{post_id}/like", headers=headers, timeout=5)
        assert r4.status_code == 200

    def test_favorite_and_list_and_unfavorite_idempotent(self, crud_base_url):
        user_id = 8001
        headers = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=user_id)
        post_id = self._create_post(crud_base_url, author_id=user_id, community_id=community_id, book_id=book_id)

        # favorite
        r1 = requests.post(f"{crud_base_url}/api/posts/{post_id}/favorite", headers=headers, timeout=5)
        assert r1.status_code == 200

        # list favorites includes post
        r2 = requests.get(f"{crud_base_url}/api/users/favorites", headers=headers, timeout=5)
        assert r2.status_code == 200
        items = r2.json()
        assert any(i["postId"] == post_id for i in items)

        # favorite again (idempotent)
        r3 = requests.post(f"{crud_base_url}/api/posts/{post_id}/favorite", headers=headers, timeout=5)
        assert r3.status_code == 200

        # unfavorite twice (idempotent)
        r4 = requests.delete(f"{crud_base_url}/api/posts/{post_id}/favorite", headers=headers, timeout=5)
        assert r4.status_code == 200
        r5 = requests.delete(f"{crud_base_url}/api/posts/{post_id}/favorite", headers=headers, timeout=5)
        assert r5.status_code == 200


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

