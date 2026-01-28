#!/usr/bin/env python3

import requests


class TestCrudOperational:
    def test_health(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/health", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"

    def test_version(self, crud_base_url):
        response = requests.get(f"{crud_base_url}/version", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert data.get("service") == "crud"
        assert isinstance(data.get("version"), str)
        assert len(data["version"]) > 0


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v", "-s"])

