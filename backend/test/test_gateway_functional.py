#!/usr/bin/env python3

import os
import uuid as uuid_lib

import pytest
import requests

if os.environ.get("SELECTIO_COMPOSE_FILE") != "docker-compose.gateway.yml":
    pytest.skip("gateway-only tests (set SELECTIO_COMPOSE_FILE=docker-compose.gateway.yml)", allow_module_level=True)


def _register_via_gateway(base_url: str, email: str, username: str, password: str) -> str:
    resp = requests.post(
        f"{base_url}/api/auth/register",
        json={"email": email, "username": username, "password": password, "description": "Gateway test user"},
        timeout=15,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "uuid" in data, data
    return data["uuid"]


def _verify_via_gateway(base_url: str, verification_uuid: str) -> None:
    # Gateway supports GET verification for browser links.
    resp = requests.get(f"{base_url}/api/auth/verify/{verification_uuid}", timeout=15)
    assert resp.status_code == 200, resp.text


def _login_via_gateway(base_url: str, email: str, password: str) -> str:
    resp = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": email, "password": password},
        timeout=15,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "token" in data, data
    return data["token"]


def _create_user_token(base_url: str) -> str:
    email = f"gw_{uuid_lib.uuid4().hex[:8]}@example.com"
    username = f"gw_user_{uuid_lib.uuid4().hex[:8]}"
    password = "SecurePassword123!"

    verification_uuid = _register_via_gateway(base_url, email, username, password)
    _verify_via_gateway(base_url, verification_uuid)
    return _login_via_gateway(base_url, email, password)


@pytest.mark.gateway
class TestGateway:
    def test_health_and_version(self, gateway_base_url):
        health = requests.get(f"{gateway_base_url}/health", timeout=5)
        assert health.status_code == 200
        assert health.json().get("status") == "ok"

        version = requests.get(f"{gateway_base_url}/version", timeout=5)
        assert version.status_code == 200
        data = version.json()
        assert data.get("service") == "gateway"
        assert "version" in data

    def test_routing_to_crud(self, gateway_base_url):
        resp = requests.get(f"{gateway_base_url}/api/books", timeout=10)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)

    def test_header_stripping_does_not_grant_access(self, gateway_base_url):
        # PUT /api/users/profile is user-scoped. Client-supplied X-User-Id must be stripped.
        resp = requests.put(
            f"{gateway_base_url}/api/users/profile",
            headers={"X-User-Id": "999"},
            json={"username": "should_not_work", "description": "x", "avatarUrl": ""},
            timeout=10,
        )
        assert resp.status_code == 401
        data = resp.json()
        assert data["error"]["code"] == "unauthorized"

    def test_jwt_injects_user_headers_to_crud(self, gateway_base_url):
        token = _create_user_token(gateway_base_url)
        headers = {"Authorization": f"Bearer {token}"}

        new_username = f"profile_{uuid_lib.uuid4().hex[:8]}"
        resp = requests.put(
            f"{gateway_base_url}/api/users/profile",
            headers=headers,
            json={"username": new_username, "description": "from gateway", "avatarUrl": ""},
            timeout=15,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["username"] == new_username

    def test_owner_enforcement_posts(self, gateway_base_url):
        token_a = _create_user_token(gateway_base_url)
        token_b = _create_user_token(gateway_base_url)

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Pick a book (seeded).
        books = requests.get(f"{gateway_base_url}/api/books", timeout=15).json()
        assert books, "expected seeded books"
        book_id = books[0]["id"]

        # Create a community as user A (owner).
        community_name = f"gw_comm_{uuid_lib.uuid4().hex[:8]}"
        c_resp = requests.post(
            f"{gateway_base_url}/api/communities",
            headers=headers_a,
            json={"name": community_name, "description": "test"},
            timeout=15,
        )
        assert c_resp.status_code == 200, c_resp.text
        community_id = c_resp.json()["id"]

        # Create a post as user A.
        p_resp = requests.post(
            f"{gateway_base_url}/api/posts",
            headers=headers_a,
            json={"communityId": community_id, "bookId": book_id, "content": "hello"},
            timeout=15,
        )
        assert p_resp.status_code == 200, p_resp.text
        post_id = p_resp.json()["id"]

        # User B cannot edit user A's post (blocked at gateway).
        edit_resp = requests.put(
            f"{gateway_base_url}/api/posts/{post_id}",
            headers=headers_b,
            json={"content": "should be forbidden"},
            timeout=15,
        )
        assert edit_resp.status_code == 403
        data = edit_resp.json()
        assert data["error"]["code"] == "forbidden"

    def test_moderator_enforcement(self, gateway_base_url):
        token_owner = _create_user_token(gateway_base_url)
        token_member = _create_user_token(gateway_base_url)

        h_owner = {"Authorization": f"Bearer {token_owner}"}
        h_member = {"Authorization": f"Bearer {token_member}"}

        books = requests.get(f"{gateway_base_url}/api/books", timeout=15).json()
        assert books, "expected seeded books"
        book_id = books[0]["id"]

        # Owner creates community.
        community_name = f"gw_mod_{uuid_lib.uuid4().hex[:8]}"
        c_resp = requests.post(
            f"{gateway_base_url}/api/communities",
            headers=h_owner,
            json={"name": community_name, "description": "test"},
            timeout=15,
        )
        assert c_resp.status_code == 200, c_resp.text
        community_id = c_resp.json()["id"]

        # Member joins.
        j_resp = requests.post(
            f"{gateway_base_url}/api/communities/{community_id}/join",
            headers=h_member,
            timeout=15,
        )
        assert j_resp.status_code == 200, j_resp.text

        # Member suggests a post.
        s_resp = requests.post(
            f"{gateway_base_url}/api/posts/suggest",
            headers=h_member,
            json={"communityId": community_id, "bookId": book_id, "content": "suggested"},
            timeout=15,
        )
        assert s_resp.status_code == 200, s_resp.text
        post_id = s_resp.json()["id"]

        # Member cannot list suggestions.
        sugg_member = requests.get(
            f"{gateway_base_url}/api/communities/{community_id}/suggestions",
            headers=h_member,
            timeout=15,
        )
        assert sugg_member.status_code == 403
        assert sugg_member.json()["error"]["code"] == "forbidden"

        # Owner can list suggestions (Owner counts as Moderator for gateway).
        sugg_owner = requests.get(
            f"{gateway_base_url}/api/communities/{community_id}/suggestions",
            headers=h_owner,
            timeout=15,
        )
        assert sugg_owner.status_code == 200, sugg_owner.text

        # Member cannot approve.
        approve_member = requests.post(
            f"{gateway_base_url}/api/posts/{post_id}/approve",
            headers=h_member,
            timeout=15,
        )
        assert approve_member.status_code == 403
        assert approve_member.json()["error"]["code"] == "forbidden"

        # Owner can approve.
        approve_owner = requests.post(
            f"{gateway_base_url}/api/posts/{post_id}/approve",
            headers=h_owner,
            timeout=15,
        )
        assert approve_owner.status_code == 200, approve_owner.text
        assert approve_owner.json()["postId"] == post_id

