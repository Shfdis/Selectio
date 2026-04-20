#!/usr/bin/env python3
"""Tests for embedding derivation: post = avg(community, book) or book; community = avg(posts)."""

import subprocess
import uuid

import pytest
import requests

from helpers import (
    cleanup_seeded_books_by_title,
    seed_crud_book_with_embedding,
)


def _get_post_embedding_from_db(post_id: int, container_name: str = "selectio_postgres", db_name: str = "selectio_main") -> list | None:
    cmd = [
        "docker", "exec", container_name,
        "psql", "-U", "postgres", "-d", db_name, "-t", "-A", "-c",
        f'SELECT "Embedding"::text FROM crud."Posts" WHERE "Id" = {post_id};',
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, check=True)
    s = (result.stdout or "").strip()
    if not s or s == "":
        return None
    if s.upper() == "NULL":
        return None
    # pgvector text is [0.1,0.2,...]; legacy real[] was {0.1,0.2,...}
    if s.startswith("["):
        s = s.strip("[]")
        return [float(x) for x in s.split(",")] if s else None
    s = s.strip("{}")
    return [float(x) for x in s.split(",")] if s else None


def _get_community_embedding_from_db(community_id: int, container_name: str = "selectio_postgres", db_name: str = "selectio_main") -> list | None:
    cmd = [
        "docker", "exec", container_name,
        "psql", "-U", "postgres", "-d", db_name, "-t", "-A", "-c",
        f'SELECT "Embedding"::text FROM crud."Communities" WHERE "Id" = {community_id};',
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, check=True)
    s = (result.stdout or "").strip()
    if not s or s == "":
        return None
    if s.upper() == "NULL":
        return None
    if s.startswith("["):
        s = s.strip("[]")
        return [float(x) for x in s.split(",")] if s else None
    s = s.strip("{}")
    return [float(x) for x in s.split(",")] if s else None


class TestCrudEmbeddings:
    def test_post_embedding_equals_book_when_community_has_no_other_posts(self, crud_base_url):
        """First post in community: post embedding should equal book embedding."""
        title = f"emb_book_{uuid.uuid4().hex[:8]}"
        embedding = [0.1 * (i % 10) for i in range(72)]
        seed_crud_book_with_embedding(title=title, embedding_list=embedding)
        try:
            books = requests.get(f"{crud_base_url}/api/books", timeout=5).json()
            book_id = next(b["id"] for b in books if b["title"] == title)
            user_id = 5001
            headers = {"X-User-Id": str(user_id)}
            comm_name = f"emb_comm_{uuid.uuid4().hex[:8]}"
            cr = requests.post(
                f"{crud_base_url}/api/communities",
                json={"name": comm_name, "description": ""},
                headers=headers,
                timeout=5,
            )
            assert cr.status_code == 200
            community_id = cr.json()["id"]
            pr = requests.post(
                f"{crud_base_url}/api/posts",
                json={"communityId": community_id, "bookId": book_id, "content": "First post"},
                headers=headers,
                timeout=5,
            )
            assert pr.status_code == 200
            post_id = pr.json()["id"]
            post_emb = _get_post_embedding_from_db(post_id)
            comm_emb = _get_community_embedding_from_db(community_id)
            assert post_emb is not None, "post should have embedding"
            assert comm_emb is not None, "community should have embedding"
            assert len(post_emb) == 72
            assert len(comm_emb) == 72
            for i in range(72):
                assert abs(post_emb[i] - embedding[i]) < 1e-5, f"post_emb[{i}] ~= embedding[{i}]"
            for i in range(72):
                assert abs(comm_emb[i] - embedding[i]) < 1e-5, f"comm_emb[{i}] ~= embedding[{i}]"
        finally:
            try:
                cleanup_seeded_books_by_title(title=title)
            except subprocess.CalledProcessError:
                pass

    def test_community_embedding_updates_when_second_post_added(self, crud_base_url):
        """Two posts: community embedding should be average of both post embeddings."""
        title = f"emb_book2_{uuid.uuid4().hex[:8]}"
        seed_crud_book_with_embedding(title=title, embedding_list=[1.0] * 72)
        try:
            books = requests.get(f"{crud_base_url}/api/books", timeout=5).json()
            book_id = next(b["id"] for b in books if b["title"] == title)
            user_id = 5002
            headers = {"X-User-Id": str(user_id)}
            comm_name = f"emb_comm2_{uuid.uuid4().hex[:8]}"
            cr = requests.post(
                f"{crud_base_url}/api/communities",
                json={"name": comm_name, "description": ""},
                headers=headers,
                timeout=5,
            )
            assert cr.status_code == 200
            community_id = cr.json()["id"]
            p1 = requests.post(
                f"{crud_base_url}/api/posts",
                json={"communityId": community_id, "bookId": book_id, "content": "Post 1"},
                headers=headers,
                timeout=5,
            )
            assert p1.status_code == 200
            p2 = requests.post(
                f"{crud_base_url}/api/posts",
                json={"communityId": community_id, "bookId": book_id, "content": "Post 2"},
                headers=headers,
                timeout=5,
            )
            assert p2.status_code == 200
            comm_emb = _get_community_embedding_from_db(community_id)
            assert comm_emb is not None
            assert len(comm_emb) == 72
            assert all(c == 1.0 for c in comm_emb), "community with two same-embedding posts should have that embedding"
        finally:
            try:
                cleanup_seeded_books_by_title(title=title)
            except subprocess.CalledProcessError:
                pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
