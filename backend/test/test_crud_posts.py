#!/usr/bin/env python3

import requests
import subprocess
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
    @staticmethod
    def _seed_seen_post(user_id: int, post_id: int, seen_at_sql: str) -> None:
        cmd = [
            "docker", "exec", "selectio_postgres",
            "psql", "-U", "postgres", "-d", "selectio_main", "-c",
            f'INSERT INTO crud."SeenPosts" ("UserId","PostId","SeenAt") '
            f"VALUES ({user_id},{post_id},{seen_at_sql}) "
            f'ON CONFLICT ("UserId","PostId") DO UPDATE SET "SeenAt"=EXCLUDED."SeenAt";'
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=True)

    @staticmethod
    def _cleanup_seen_post(user_id: int, post_id: int) -> None:
        cmd = [
            "docker", "exec", "selectio_postgres",
            "psql", "-U", "postgres", "-d", "selectio_main", "-c",
            f'DELETE FROM crud."SeenPosts" WHERE "UserId"={user_id} AND "PostId"={post_id};'
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=True)

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

    def _create_post(self, crud_base_url: str, author_id: int, community_id: int, book_id: int, content: str) -> int:
        headers = {"X-User-Id": str(author_id)}
        r = requests.post(
            f"{crud_base_url}/api/posts",
            json={"communityId": community_id, "bookId": book_id, "content": content},
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

    def test_feed_includes_all_community_posts(self, crud_base_url):
        user_id = 8001
        headers = {"X-User-Id": str(user_id)}
        author_id = 8003
        outsider_author_id = 8005
        book_id = self._get_first_book_id(crud_base_url)
        subscribed_community_id = self._create_community(crud_base_url, owner_id=author_id)
        other_community_id = self._create_community(crud_base_url, owner_id=outsider_author_id)
        requests.post(
            f"{crud_base_url}/api/communities/{subscribed_community_id}/join",
            headers=headers,
            timeout=5,
        ).raise_for_status()
        subscribed_post = requests.post(
            f"{crud_base_url}/api/posts",
            json={"communityId": subscribed_community_id, "bookId": book_id, "content": "Feed test subscribed post"},
            headers={"X-User-Id": str(author_id)},
            timeout=5,
        )
        assert subscribed_post.status_code == 200
        subscribed_post_id = subscribed_post.json()["id"]
        other_post = requests.post(
            f"{crud_base_url}/api/posts",
            json={"communityId": other_community_id, "bookId": book_id, "content": "Feed test non-subscribed post"},
            headers={"X-User-Id": str(outsider_author_id)},
            timeout=5,
        )
        assert other_post.status_code == 200
        other_post_id = other_post.json()["id"]

        feed = requests.get(f"{crud_base_url}/api/users/me/feed", headers=headers, timeout=5)
        assert feed.status_code == 200
        items = feed.json()
        assert isinstance(items, list)
        assert any(p["id"] == subscribed_post_id for p in items)
        assert any(p["id"] == other_post_id for p in items)

        for post in items:
            if post["id"] in (subscribed_post_id, other_post_id):
                _assert_post_feed_item(post)

    def test_feed_like_and_favorite_flags(self, crud_base_url):
        user_id = 8002
        headers = {"X-User-Id": str(user_id)}
        author_id = 8004
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=author_id)
        requests.post(
            f"{crud_base_url}/api/communities/{community_id}/join",
            headers=headers,
            timeout=5,
        ).raise_for_status()
        r = requests.post(
            f"{crud_base_url}/api/posts",
            json={"communityId": community_id, "bookId": book_id, "content": "flags"},
            headers={"X-User-Id": str(author_id)},
            timeout=5,
        )
        assert r.status_code == 200
        post_id = r.json()["id"]
        requests.post(f"{crud_base_url}/api/posts/{post_id}/like", headers=headers, timeout=5).raise_for_status()
        requests.post(f"{crud_base_url}/api/posts/{post_id}/favorite", headers=headers, timeout=5).raise_for_status()
        by_id = requests.get(f"{crud_base_url}/api/posts/{post_id}", headers=headers, timeout=5)
        assert by_id.status_code == 200
        row = by_id.json()
        _assert_post_feed_item(row)
        assert row["likedByCurrentUser"] is True
        assert row["favoritedByCurrentUser"] is True
        assert row["likeCount"] >= 1

        # Liked/favorited posts are permanently excluded from personalized feed.
        feed = requests.get(f"{crud_base_url}/api/users/me/feed", headers=headers, timeout=5).json()
        assert all(p["id"] != post_id for p in feed)

    def test_recommended_posts_excludes_seen_posts(self, crud_base_url):
        user_id = 8101
        author_id = 8102
        user_headers = {"X-User-Id": str(user_id)}

        books = requests.get(
            f"{crud_base_url}/api/books",
            params={"page": 1, "pageSize": 6},
            timeout=5,
        )
        assert books.status_code == 200
        book_ids = [int(b["id"]) for b in books.json()]
        assert len(book_ids) >= 1

        # User gets an embedding baseline from library books.
        for book_id in book_ids[:2]:
            add = requests.post(
                f"{crud_base_url}/api/books/{book_id}/library",
                headers=user_headers,
                json={"status": "Read"},
                timeout=5,
            )
            assert add.status_code == 200

        community_id = self._create_community(crud_base_url, owner_id=author_id)
        requests.post(
            f"{crud_base_url}/api/communities/{community_id}/join",
            headers=user_headers,
            timeout=5,
        ).raise_for_status()

        liked_post_id = self._create_post(
            crud_base_url, author_id=author_id, community_id=community_id, book_id=book_ids[min(1, len(book_ids) - 1)], content="liked"
        )
        favorited_post_id = self._create_post(
            crud_base_url, author_id=author_id, community_id=community_id, book_id=book_ids[min(2, len(book_ids) - 1)], content="favorited"
        )
        commented_post_id = self._create_post(
            crud_base_url, author_id=author_id, community_id=community_id, book_id=book_ids[min(3, len(book_ids) - 1)], content="commented"
        )
        stale_seen_post_id = self._create_post(
            crud_base_url, author_id=author_id, community_id=community_id, book_id=book_ids[min(4, len(book_ids) - 1)], content="stale-seen"
        )

        assert requests.post(
            f"{crud_base_url}/api/posts/{liked_post_id}/like",
            headers=user_headers,
            timeout=5,
        ).status_code == 200
        assert requests.post(
            f"{crud_base_url}/api/posts/{favorited_post_id}/favorite",
            headers=user_headers,
            timeout=5,
        ).status_code == 200
        assert requests.post(
            f"{crud_base_url}/api/posts/{commented_post_id}/comments",
            headers=user_headers,
            json={"content": "seen by comment"},
            timeout=5,
        ).status_code == 200

        self._seed_seen_post(user_id, stale_seen_post_id, "NOW() - INTERVAL '48 hours'")
        try:
            rec = requests.get(f"{crud_base_url}/api/posts/recommended", headers=user_headers, timeout=5)
            assert rec.status_code == 200
            rec_ids = {int(p["id"]) for p in rec.json()}
            seen_ids = {liked_post_id, favorited_post_id, commented_post_id, stale_seen_post_id}
            assert rec_ids.isdisjoint(seen_ids)
        finally:
            self._cleanup_seen_post(user_id, stale_seen_post_id)

    def test_feed_keeps_recently_seen_posts(self, crud_base_url):
        user_id = 8201
        author_id = 8202
        user_headers = {"X-User-Id": str(user_id)}

        books = requests.get(
            f"{crud_base_url}/api/books",
            params={"page": 1, "pageSize": 6},
            timeout=5,
        )
        assert books.status_code == 200
        book_ids = [int(b["id"]) for b in books.json()]
        assert len(book_ids) >= 1

        # Ensure non-null user embedding path is exercised.
        assert requests.post(
            f"{crud_base_url}/api/books/{book_ids[0]}/library",
            headers=user_headers,
            json={"status": "Reading"},
            timeout=5,
        ).status_code == 200

        community_id = self._create_community(crud_base_url, owner_id=author_id)
        requests.post(
            f"{crud_base_url}/api/communities/{community_id}/join",
            headers=user_headers,
            timeout=5,
        ).raise_for_status()

        recent_seen_post_id = self._create_post(
            crud_base_url, author_id=author_id, community_id=community_id, book_id=book_ids[min(1, len(book_ids) - 1)], content="unseen-feed"
        )
        stale_seen_post_id = self._create_post(
            crud_base_url, author_id=author_id, community_id=community_id, book_id=book_ids[min(2, len(book_ids) - 1)], content="stale-seen-feed"
        )
        self._seed_seen_post(user_id, recent_seen_post_id, "NOW()")
        self._seed_seen_post(user_id, stale_seen_post_id, "NOW() - INTERVAL '48 hours'")
        try:
            feed = requests.get(f"{crud_base_url}/api/users/me/feed", headers=user_headers, timeout=5)
            assert feed.status_code == 200
            feed_ids = {int(p["id"]) for p in feed.json()}
            assert recent_seen_post_id in feed_ids
            assert stale_seen_post_id not in feed_ids
        finally:
            self._cleanup_seen_post(user_id, recent_seen_post_id)
            self._cleanup_seen_post(user_id, stale_seen_post_id)

    def test_recommended_posts_only_from_subscribed_communities(self, crud_base_url):
        user_id = 8301
        user_headers = {"X-User-Id": str(user_id)}
        author_a = 8302
        author_b = 8303
        book_id = self._get_first_book_id(crud_base_url)

        assert requests.post(
            f"{crud_base_url}/api/books/{book_id}/library",
            headers=user_headers,
            json={"status": "Read"},
            timeout=5,
        ).status_code == 200

        joined_community_id = self._create_community(crud_base_url, owner_id=author_a)
        other_community_id = self._create_community(crud_base_url, owner_id=author_b)
        requests.post(
            f"{crud_base_url}/api/communities/{joined_community_id}/join",
            headers=user_headers,
            timeout=5,
        ).raise_for_status()

        joined_post_id = self._create_post(crud_base_url, author_a, joined_community_id, book_id, "joined-community")
        other_post_id = self._create_post(crud_base_url, author_b, other_community_id, book_id, "other-community")

        rec = requests.get(f"{crud_base_url}/api/posts/recommended", headers=user_headers, timeout=5)
        assert rec.status_code == 200
        items = rec.json()
        rec_ids = {int(p["id"]) for p in items}
        assert other_post_id not in rec_ids
        assert all(int(p["communityId"]) == joined_community_id for p in items)

    def test_feed_excludes_liked_commented_favorited_posts(self, crud_base_url):
        user_id = 8401
        author_id = 8402
        user_headers = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)

        assert requests.post(
            f"{crud_base_url}/api/books/{book_id}/library",
            headers=user_headers,
            json={"status": "Read"},
            timeout=5,
        ).status_code == 200

        community_id = self._create_community(crud_base_url, owner_id=author_id)
        liked_post_id = self._create_post(crud_base_url, author_id, community_id, book_id, "liked-feed")
        favorited_post_id = self._create_post(crud_base_url, author_id, community_id, book_id, "favorited-feed")
        commented_post_id = self._create_post(crud_base_url, author_id, community_id, book_id, "commented-feed")

        assert requests.post(f"{crud_base_url}/api/posts/{liked_post_id}/like", headers=user_headers, timeout=5).status_code == 200
        assert requests.post(f"{crud_base_url}/api/posts/{favorited_post_id}/favorite", headers=user_headers, timeout=5).status_code == 200
        assert requests.post(
            f"{crud_base_url}/api/posts/{commented_post_id}/comments",
            headers=user_headers,
            json={"content": "comment"},
            timeout=5,
        ).status_code == 200

        feed = requests.get(f"{crud_base_url}/api/users/me/feed", headers=user_headers, timeout=5)
        assert feed.status_code == 200
        feed_ids = {int(p["id"]) for p in feed.json()}
        assert liked_post_id not in feed_ids
        assert favorited_post_id not in feed_ids
        assert commented_post_id not in feed_ids


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

