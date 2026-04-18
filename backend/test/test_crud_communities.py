#!/usr/bin/env python3

import requests
import uuid


class TestCrudCommunities:
    def test_create_get_join_leave_and_list_user_communities(self, crud_base_url):
        owner_id = 1001
        member_id = 1002
        owner_headers = {"X-User-Id": str(owner_id)}
        member_headers = {"X-User-Id": str(member_id)}

        name = f"community_{uuid.uuid4().hex[:8]}"
        payload = {"name": name, "description": "Test community", "coverUrl": "https://example.com/cover.png", "genre": "Fiction"}

        # create
        r = requests.post(f"{crud_base_url}/api/communities", json=payload, headers=owner_headers, timeout=5)
        assert r.status_code == 200
        created = r.json()
        community_id = created["id"]
        assert created["name"] == name
        assert created["ownerUserId"] == owner_id
        assert created.get("coverUrl") == "https://example.com/cover.png"
        assert created.get("genre") == "Fiction"
        assert "subscriberCount" in created

        # get
        r2 = requests.get(f"{crud_base_url}/api/communities/{community_id}", timeout=5)
        assert r2.status_code == 200
        assert r2.json().get("subscriberCount") is not None

        # member joins
        r3 = requests.post(f"{crud_base_url}/api/communities/{community_id}/join", headers=member_headers, timeout=5)
        assert r3.status_code == 200
        mem = r3.json()
        assert mem["communityId"] == community_id
        assert mem["userId"] == member_id
        assert mem["role"] == "Member"

        # list member communities
        r4 = requests.get(f"{crud_base_url}/api/users/{member_id}/communities", timeout=5)
        assert r4.status_code == 200
        items = r4.json()
        assert any(c["id"] == community_id for c in items)

        # member leaves
        r5 = requests.post(f"{crud_base_url}/api/communities/{community_id}/leave", headers=member_headers, timeout=5)
        assert r5.status_code == 200

        # verify removed from list
        r6 = requests.get(f"{crud_base_url}/api/users/{member_id}/communities", timeout=5)
        assert r6.status_code == 200
        items2 = r6.json()
        assert all(c["id"] != community_id for c in items2)

    def test_communities_list_genre_filter(self, crud_base_url):
        r = requests.get(f"{crud_base_url}/api/communities", params={"genre": "Fiction", "pageSize": 5}, timeout=5)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for c in data:
            assert "coverUrl" in c
            assert "genre" in c
            assert "subscriberCount" in c

    def test_community_by_id_includes_subscriber_count(self, crud_base_url):
        r = requests.get(f"{crud_base_url}/api/communities", params={"pageSize": 1}, timeout=5)
        assert r.status_code == 200
        communities = r.json()
        if not communities:
            return
        cid = communities[0]["id"]
        r2 = requests.get(f"{crud_base_url}/api/communities/{cid}", timeout=5)
        assert r2.status_code == 200
        assert "subscriberCount" in r2.json()


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

