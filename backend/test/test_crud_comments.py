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
        assert "authorUsername" in comment
        assert comment["authorUsername"].startswith("user")

        # list
        r2 = requests.get(f"{crud_base_url}/api/posts/{post_id}/comments", timeout=5)
        assert r2.status_code == 200
        items = r2.json()
        assert any(c["id"] == comment_id for c in items)
        listed = next(c for c in items if c["id"] == comment_id)
        assert listed["authorUsername"] == comment["authorUsername"]

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
        listed = next(c for c in items if c["id"] == comment_id)
        assert "authorUsername" in listed
        assert listed["authorUsername"].startswith("user")

    def test_book_comments_edit_delete(self, crud_base_url):
        user_id = 6010
        headers = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)

        r_create = requests.post(
            f"{crud_base_url}/api/books/{book_id}/comments",
            json={"content": "Original review", "rating": 4},
            headers=headers,
            timeout=5,
        )
        assert r_create.status_code == 200
        comment_id = r_create.json()["id"]

        r_edit = requests.put(
            f"{crud_base_url}/api/book-comments/{comment_id}",
            json={"content": "Edited review", "rating": 5},
            headers=headers,
            timeout=5,
        )
        assert r_edit.status_code == 200
        edited = r_edit.json()
        assert edited["content"] == "Edited review"
        assert edited["rating"] == 5

        r_del = requests.delete(
            f"{crud_base_url}/api/book-comments/{comment_id}",
            headers=headers,
            timeout=5,
        )
        assert r_del.status_code == 200

        r_list = requests.get(f"{crud_base_url}/api/books/{book_id}/comments", timeout=5)
        assert r_list.status_code == 200
        assert all(c["id"] != comment_id for c in r_list.json())

    def test_my_book_comments_filters_and_paginates(self, crud_base_url):
        book_id = self._get_first_book_id(crud_base_url)

        user1_id = 7001
        user2_id = 7002

        h1 = {"X-User-Id": str(user1_id)}
        h2 = {"X-User-Id": str(user2_id)}

        # user1 creates 3 comments
        for i in range(3):
            r = requests.post(
                f"{crud_base_url}/api/books/{book_id}/comments",
                json={"content": f"u1_{i}", "rating": 5},
                headers=h1,
                timeout=5,
            )
            assert r.status_code == 200, r.text

        # user2 creates 1 comment
        r_other = requests.post(
            f"{crud_base_url}/api/books/{book_id}/comments",
            json={"content": "u2_only", "rating": 4},
            headers=h2,
            timeout=5,
        )
        assert r_other.status_code == 200, r_other.text

        # user1 fetches their comments
        r_list = requests.get(
            f"{crud_base_url}/api/users/me/book-comments?page=1&pageSize=2",
            headers=h1,
            timeout=5,
        )
        assert r_list.status_code == 200, r_list.text
        data = r_list.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert all(c["authorUserId"] == user1_id for c in data)

        # page 2 should contain the remaining 1 comment for user1
        r_list2 = requests.get(
            f"{crud_base_url}/api/users/me/book-comments?page=2&pageSize=2",
            headers=h1,
            timeout=5,
        )
        assert r_list2.status_code == 200, r_list2.text
        data2 = r_list2.json()
        assert isinstance(data2, list)
        assert len(data2) == 1
        assert all(c["authorUserId"] == user1_id for c in data2)

    def test_my_book_comments_include_book_summary(self, crud_base_url):
        user_id = 7101
        h = {"X-User-Id": str(user_id)}
        book_id = self._get_first_book_id(crud_base_url)
        r = requests.post(
            f"{crud_base_url}/api/books/{book_id}/comments",
            json={"content": "with book", "rating": 4},
            headers=h,
            timeout=5,
        )
        assert r.status_code == 200
        r_list = requests.get(f"{crud_base_url}/api/users/me/book-comments", headers=h, timeout=5)
        assert r_list.status_code == 200
        rows = r_list.json()
        row = next(x for x in rows if x["content"] == "with book")
        assert "book" in row
        b = row["book"]
        assert b["id"] == book_id
        for k in ("title", "author", "genre", "coverUrl"):
            assert k in b

    def test_my_book_comments_requires_user_header(self, crud_base_url):
        r = requests.get(f"{crud_base_url}/api/users/me/book-comments", timeout=5)
        assert r.status_code == 401


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

