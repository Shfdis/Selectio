#!/usr/bin/env python3
"""
Functional tests for CRUD moderation endpoints
"""

import requests
import uuid


class TestCrudModeration:
    def _get_first_book_id(self, crud_base_url: str) -> int:
        r = requests.get(f"{crud_base_url}/api/books", timeout=5)
        r.raise_for_status()
        return int(r.json()[0]["id"])

    def _create_community(self, crud_base_url: str, owner_id: int) -> int:
        headers = {"X-User-Id": str(owner_id)}
        name = f"mod_{uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{crud_base_url}/api/communities",
            json={"name": name, "description": ""},
            headers=headers,
            timeout=5,
        )
        r.raise_for_status()
        return int(r.json()["id"])

    def _suggest_post(self, crud_base_url: str, author_id: int, community_id: int, book_id: int) -> int:
        headers = {"X-User-Id": str(author_id)}
        r = requests.post(
            f"{crud_base_url}/api/posts/suggest",
            json={"communityId": community_id, "bookId": book_id, "content": "Suggested post"},
            headers=headers,
            timeout=5,
        )
        r.raise_for_status()
        return int(r.json()["id"])

    def test_suggestions_list_and_approve(self, crud_base_url):
        owner_id = 9001
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=owner_id)
        post_id = self._suggest_post(crud_base_url, author_id=owner_id, community_id=community_id, book_id=book_id)

        # list suggestions includes post
        r = requests.get(f"{crud_base_url}/api/communities/{community_id}/suggestions", timeout=5)
        assert r.status_code == 200
        items = r.json()
        assert any(p["id"] == post_id for p in items)

        # approve
        r2 = requests.post(f"{crud_base_url}/api/posts/{post_id}/approve", timeout=5)
        assert r2.status_code == 200
        assert r2.json()["postId"] == post_id

        # now it should show up in published feed
        feed = requests.get(f"{crud_base_url}/api/communities/{community_id}/posts", timeout=5).json()
        assert any(p["id"] == post_id for p in feed)

    def test_reject_deletes_post(self, crud_base_url):
        owner_id = 9002
        book_id = self._get_first_book_id(crud_base_url)
        community_id = self._create_community(crud_base_url, owner_id=owner_id)
        post_id = self._suggest_post(crud_base_url, author_id=owner_id, community_id=community_id, book_id=book_id)

        r = requests.post(f"{crud_base_url}/api/posts/{post_id}/reject", timeout=5)
        assert r.status_code == 200

        r2 = requests.get(f"{crud_base_url}/api/posts/{post_id}", timeout=5)
        assert r2.status_code == 404


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

