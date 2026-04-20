#!/usr/bin/env python3

import io
import uuid as uuid_lib

import pytest
import requests

from helpers import generate_unique_email, generate_unique_username, register_verify_and_login


def _minimal_png_bytes() -> bytes:
    """1x1 transparent PNG."""
    return (
        b"\x89PNG\r\n\x1a\n"
        b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
        b"\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
        b"\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )


class TestImageServiceGateway:
    def test_upload_without_token_returns_401(self, gateway_public_url):
        files = {"file": ("t.png", io.BytesIO(_minimal_png_bytes()), "image/png")}
        r = requests.post(f"{gateway_public_url}/api/images", files=files, timeout=15)
        assert r.status_code == 401

    def test_upload_and_fetch_via_gateway_url(self, gateway_public_url):
        auth_base = "http://localhost:8080"
        email = generate_unique_email("img")
        username = generate_unique_username("img")
        password = "ImageUploadTest123!"
        _, token = register_verify_and_login(auth_base, email, username, password)

        files = {"file": ("t.png", io.BytesIO(_minimal_png_bytes()), "image/png")}
        r = requests.post(
            f"{gateway_public_url}/api/images",
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data
        assert data["url"].startswith(gateway_public_url.rstrip("/") + "/media/")

        img = requests.get(data["url"], timeout=30)
        assert img.status_code == 200
        assert img.headers.get("content-type", "").startswith("image/")

    def test_upload_rejects_non_image(self, gateway_public_url):
        auth_base = "http://localhost:8080"
        email = generate_unique_email("img2")
        username = generate_unique_username("img2")
        password = "ImageUploadTest123!"
        _, token = register_verify_and_login(auth_base, email, username, password)

        files = {"file": ("x.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(
            f"{gateway_public_url}/api/images",
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            timeout=30,
        )
        assert r.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
