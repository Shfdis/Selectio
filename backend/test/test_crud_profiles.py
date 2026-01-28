#!/usr/bin/env python3

import requests


class TestCrudProfiles:
    def test_get_missing_profile_returns_404(self, crud_base_url):
        r = requests.get(f"{crud_base_url}/api/users/99999999", timeout=5)
        assert r.status_code == 404

    def test_upsert_profile_and_get_public_profile(self, crud_base_url):
        user_id = 777
        headers = {"X-User-Id": str(user_id)}

        payload = {
            "username": "user_777",
            "description": "Hello",
            "avatarUrl": "https://example.com/avatar.png",
        }

        r = requests.put(f"{crud_base_url}/api/users/profile", json=payload, headers=headers, timeout=5)
        assert r.status_code == 200
        data = r.json()
        assert data["userId"] == user_id
        assert data["username"] == payload["username"]

        r2 = requests.get(f"{crud_base_url}/api/users/{user_id}", timeout=5)
        assert r2.status_code == 200
        pub = r2.json()
        assert pub["userId"] == user_id
        assert pub["username"] == payload["username"]

        # update (upsert)
        payload2 = {
            "username": "user_777_updated",
            "description": "Updated",
            "avatarUrl": "",
        }
        r3 = requests.put(f"{crud_base_url}/api/users/profile", json=payload2, headers=headers, timeout=5)
        assert r3.status_code == 200
        data2 = r3.json()
        assert data2["username"] == payload2["username"]

        r4 = requests.get(f"{crud_base_url}/api/users/{user_id}", timeout=5)
        assert r4.status_code == 200
        pub2 = r4.json()
        assert pub2["username"] == payload2["username"]

    def test_profile_requires_user_header(self, crud_base_url):
        r = requests.put(
            f"{crud_base_url}/api/users/profile",
            json={"username": "noheader", "description": "", "avatarUrl": ""},
            timeout=5,
        )
        assert r.status_code == 401


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

