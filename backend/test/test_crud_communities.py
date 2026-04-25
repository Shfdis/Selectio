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
        payload = {
            "name": name,
            "description": "Test community",
            "coverUrl": "https://example.com/cover.png",
            "genres": ["Fiction", " Drama ", "Fiction", ""],
        }

        # create
        r = requests.post(f"{crud_base_url}/api/communities", json=payload, headers=owner_headers, timeout=5)
        assert r.status_code == 200
        created = r.json()
        community_id = created["id"]
        assert created["name"] == name
        assert created["ownerUserId"] == owner_id
        assert created.get("coverUrl") == "https://example.com/cover.png"
        assert created.get("genres") == ["Fiction", "Drama"]
        assert created.get("subscriberCount") == 0

        # get
        r2 = requests.get(f"{crud_base_url}/api/communities/{community_id}", timeout=5)
        assert r2.status_code == 200
        assert r2.json().get("subscriberCount") == 0

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

    def test_owner_cannot_join_own_community(self, crud_base_url):
        owner_id = 1010
        owner_headers = {"X-User-Id": str(owner_id)}
        name = f"community_owner_join_{uuid.uuid4().hex[:8]}"
        created = requests.post(
            f"{crud_base_url}/api/communities",
            json={"name": name, "description": "owner join check"},
            headers=owner_headers,
            timeout=5,
        )
        assert created.status_code == 200
        community_id = int(created.json()["id"])

        joined = requests.post(
            f"{crud_base_url}/api/communities/{community_id}/join",
            headers=owner_headers,
            timeout=5,
        )
        assert joined.status_code == 400
        assert "owner cannot join own community" in joined.text

    def test_communities_list_genre_filter(self, crud_base_url):
        r = requests.get(f"{crud_base_url}/api/communities", params={"genre": "Fiction", "pageSize": 5}, timeout=5)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for c in data:
            assert "coverUrl" in c
            assert "genres" in c
            assert "subscriberCount" in c

    def test_owner_can_put_update_community(self, crud_base_url):
        owner_id = 2001
        headers = {"X-User-Id": str(owner_id)}
        name = f"put_comm_{uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{crud_base_url}/api/communities",
            json={"name": name, "description": "d0", "genres": ["A"]},
            headers=headers,
            timeout=5,
        )
        assert r.status_code == 200
        cid = r.json()["id"]
        r2 = requests.put(
            f"{crud_base_url}/api/communities/{cid}",
            json={"description": "d1", "genres": ["B", " C ", "B"]},
            headers=headers,
            timeout=5,
        )
        assert r2.status_code == 200
        j = r2.json()
        assert j["description"] == "d1"
        assert j["genres"] == ["B", "C"]
        assert j["name"] == name

    def test_non_owner_put_community_forbidden(self, crud_base_url):
        owner_id = 2002
        other_id = 2003
        name = f"put_denied_{uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{crud_base_url}/api/communities",
            json={"name": name},
            headers={"X-User-Id": str(owner_id)},
            timeout=5,
        )
        assert r.status_code == 200
        cid = r.json()["id"]
        r2 = requests.put(
            f"{crud_base_url}/api/communities/{cid}",
            json={"description": "hack"},
            headers={"X-User-Id": str(other_id)},
            timeout=5,
        )
        assert r2.status_code == 403

    def test_owner_can_delete_community(self, crud_base_url):
        owner_id = 2010
        headers = {"X-User-Id": str(owner_id)}
        name = f"del_comm_{uuid.uuid4().hex[:8]}"
        created = requests.post(
            f"{crud_base_url}/api/communities",
            json={"name": name},
            headers=headers,
            timeout=5,
        )
        assert created.status_code == 200
        cid = created.json()["id"]

        deleted = requests.delete(
            f"{crud_base_url}/api/communities/{cid}",
            headers=headers,
            timeout=5,
        )
        assert deleted.status_code == 200

        missing = requests.get(f"{crud_base_url}/api/communities/{cid}", timeout=5)
        assert missing.status_code == 404

    def test_non_owner_delete_community_forbidden(self, crud_base_url):
        owner_id = 2011
        other_id = 2012
        name = f"del_denied_{uuid.uuid4().hex[:8]}"
        created = requests.post(
            f"{crud_base_url}/api/communities",
            json={"name": name},
            headers={"X-User-Id": str(owner_id)},
            timeout=5,
        )
        assert created.status_code == 200
        cid = created.json()["id"]

        denied = requests.delete(
            f"{crud_base_url}/api/communities/{cid}",
            headers={"X-User-Id": str(other_id)},
            timeout=5,
        )
        assert denied.status_code == 403

    def test_delete_missing_community_returns_404(self, crud_base_url):
        resp = requests.delete(
            f"{crud_base_url}/api/communities/99999999",
            headers={"X-User-Id": "2013"},
            timeout=5,
        )
        assert resp.status_code == 404

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

