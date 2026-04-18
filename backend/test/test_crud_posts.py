#!/usr/bin/env python3

import requests
import uuid


def _assert_post_feed_item(item: dict) -> None:
    """Response shape for feed-style post payloads (GET by id, community posts, me/feed, recommended)."""
    for key in (
        "id",
        "communityId",
        "authorUserId",
        "authorUsername",
        "bookId",
        "content",
        "status",
        "createdAt",
        "book",
        "likeCount",
        "commentCount",
        "likedByCurrentUser",
        "favoritedByCurrentUser",
    ):
        assert key in item, f"missing {key}: {item.keys()}"
    b = item["book"]
    assert isinstance(b, dict)
    for bk in ("id", "title", "author", "genre", "coverUrl"):
        assert bk in b


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
            json={"communityId": community_id, "bookId": book_id, "content": "Hello world", "photoUrl": "https://example.com/photo.jpg"},
            headers=author_headers,
            timeout=5,
        )
        assert r.status_code == 200
        post = r.json()
        post_id = post["id"]
        assert post["status"] == "Published"
        assert post.get("photoUrl") == "https://example.com/photo.jpg"

        # get (feed-shaped)
        r2 = requests.get(f"{crud_base_url}/api/posts/{post_id}", timeout=5)
        assert r2.status_code == 200
        got = r2.json()
        _assert_post_feed_item(got)
        assert got.get("photoUrl") == "https://example.com/photo.jpg"
        assert got["authorUserId"] == author_id
        assert got["likeCount"] == 0
        assert got["commentCount"] == 0

        # feed includes post
        r3 = requests.get(
            f"{crud_base_url}/api/communities/{community_id}/posts",
            headers=author_headers,
            timeout=5,
        )
        assert r3.status_code == 200
        feed = r3.json()
        assert any(p["id"] == post_id for p in feed)
        row = next(p for p in feed if p["id"] == post_id)
        _assert_post_feed_item(row)
        assert row["likedByCurrentUser"] is False
        assert row["favoritedByCurrentUser"] is False

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
        sug = r0b.json()
        _assert_post_feed_item(sug)
        assert sug["status"] == "Suggested"

        feed = requests.get(f"{crud_base_url}/api/communities/{community_id}/posts", timeout=5).json()
        assert all(p["id"] != post_id for p in feed)

    def test_recommended_posts_requires_user(self, crud_base_url):
        r = requests.get(f"{crud_base_url}/api/posts/recommended", timeout=5)
        assert r.status_code == 401

    def test_recommended_posts_returns_list(self, crud_base_url):
        headers = {"X-User-Id": "7001"}
        r = requests.get(f"{crud_base_url}/api/posts/recommended", headers=headers, timeout=5)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for item in data:
            _assert_post_feed_item(item)

    def test_feed_requires_user(self, crud_base_url):
        r = requests.get(f"{crud_base_url}/api/users/me/feed", timeout=5)
        assert r.status_code == 401

    def test_feed_returns_posts_from_user_communities_only(self, crud_base_url):
        user_id = 8001
        headers = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=user_id)
        r = requests.post(
            f"{crud_base_url}/api/posts",
            json={"communityId": community_id, "bookId": book_id, "content": "Feed test post"},
            headers=headers,
            timeout=5,
        )
        assert r.status_code == 200
        post_id = r.json()["id"]
        feed = requests.get(f"{crud_base_url}/api/users/me/feed", headers=headers, timeout=5)
        assert feed.status_code == 200
        items = feed.json()
        assert isinstance(items, list)
        assert any(p["id"] == post_id for p in items)
        for p in items:
            if p["id"] == post_id:
                _assert_post_feed_item(p)
                break

    def test_feed_like_and_favorite_flags(self, crud_base_url):
        user_id = 8002
        headers = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=user_id)
        r = requests.post(
            f"{crud_base_url}/api/posts",
            json={"communityId": community_id, "bookId": book_id, "content": "flags"},
            headers=headers,
            timeout=5,
        )
        assert r.status_code == 200
        post_id = r.json()["id"]
        requests.post(f"{crud_base_url}/api/posts/{post_id}/like", headers=headers, timeout=5).raise_for_status()
        requests.post(f"{crud_base_url}/api/posts/{post_id}/favorite", headers=headers, timeout=5).raise_for_status()
        feed = requests.get(f"{crud_base_url}/api/users/me/feed", headers=headers, timeout=5).json()
        row = next(p for p in feed if p["id"] == post_id)
        _assert_post_feed_item(row)
        assert row["likedByCurrentUser"] is True
        assert row["favoritedByCurrentUser"] is True
        assert row["likeCount"] >= 1


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

