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
        payload = {"name": name, "description": "Test community"}

        # create
        r = requests.post(f"{crud_base_url}/api/communities", json=payload, headers=owner_headers, timeout=5)
        assert r.status_code == 200
        created = r.json()
        community_id = created["id"]
        assert created["name"] == name
        assert created["ownerUserId"] == owner_id

        # get
        r2 = requests.get(f"{crud_base_url}/api/communities/{community_id}", timeout=5)
        assert r2.status_code == 200

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


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

