#!/usr/bin/env python3

import pytest
import requests
import time
from helpers import (
    register_user, verify_user, login_user,
    generate_unique_email, generate_unique_username
)


class TestEmailVerification:
    def test_registration_returns_uuid(self, base_url, unique_email):
        username = generate_unique_username()
        password = "TestPassword123!"
        
        data, uuid = register_user(base_url, unique_email, username, password)
        
        assert "uuid" in data
        assert "message" in data
        assert "email verification" in data["message"].lower()
        assert len(uuid) > 0  # UUID should not be empty
    
    def test_verification_link_format(self, base_url, unique_email):
        username = generate_unique_username()
        password = "TestPassword123!"
        
        # Register user
        _, uuid = register_user(base_url, unique_email, username, password)
        
        # Verify with UUID
        verify_data = verify_user(base_url, uuid)
        
        assert "message" in verify_data
        assert "verified" in verify_data["message"].lower() or "success" in verify_data["message"].lower()
    
    def test_invalid_uuid_rejected(self, base_url):
        invalid_uuid = "00000000-0000-0000-0000-000000000000"
        
        response = requests.post(
            f"{base_url}/user/verify/{invalid_uuid}",
            timeout=10
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "Invalid verification UUID" in data["message"] or "invalid" in data["message"].lower()
    
    def test_uuid_can_only_be_used_once(self, base_url, unique_email):
        username = generate_unique_username()
        password = "TestPassword123!"
        
        # Register and verify first time
        _, uuid = register_user(base_url, unique_email, username, password)
        verify_user(base_url, uuid)
        
        # Try to verify again with same UUID - should fail
        response = requests.post(
            f"{base_url}/user/verify/{uuid}",
            timeout=10
        )
        
        assert response.status_code == 404, "UUID should not be reusable"
        data = response.json()
        assert "Invalid verification UUID" in data["message"] or "invalid" in data["message"].lower()
    
    def test_unverified_user_cannot_login(self, base_url, unique_email):
        username = generate_unique_username()
        password = "TestPassword123!"
        
        # Register but don't verify
        register_user(base_url, unique_email, username, password)
        
        # Try to login - should fail
        login_data = {
            "email": unique_email,
            "password": password
        }
        
        response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        
        assert response.status_code == 401, "Unverified users should not be able to login"
    
    def test_verified_user_can_login(self, base_url, unique_email):
        username = generate_unique_username()
        password = "TestPassword123!"
        
        # Register and verify
        _, uuid = register_user(base_url, unique_email, username, password)
        verify_user(base_url, uuid)
        
        # Login should succeed
        login_data, token = login_user(base_url, unique_email, password)
        
        assert "token" in login_data
        assert "user" in login_data
        assert login_data["user"]["email"] == unique_email
        assert len(token) > 0
    
    def test_verification_removes_from_pending(self, base_url, unique_email):
        username = generate_unique_username()
        password = "TestPassword123!"
        
        # Register
        _, uuid = register_user(base_url, unique_email, username, password)
        
        # Verify
        verify_user(base_url, uuid)
        
        # Try to verify again - should fail (user removed from pending)
        response = requests.post(
            f"{base_url}/user/verify/{uuid}",
            timeout=10
        )
        
        assert response.status_code == 404, "User should be removed from pending after verification"
    
    def test_email_verification_message_in_response(self, base_url, unique_email):
        username = generate_unique_email()
        password = "TestPassword123!"
        
        data, _ = register_user(base_url, unique_email, username, password)
        
        assert "email" in data["message"].lower() or "verification" in data["message"].lower()
        assert "check" in data["message"].lower() or "link" in data["message"].lower()
    
    def test_multiple_registrations_different_uuids(self, base_url):
        email1 = generate_unique_email()
        email2 = generate_unique_email()
        username1 = generate_unique_username()
        username2 = generate_unique_username()
        password = "TestPassword123!"
        
        _, uuid1 = register_user(base_url, email1, username1, password)
        _, uuid2 = register_user(base_url, email2, username2, password)
        
        assert uuid1 != uuid2, "Each registration should have a unique UUID"
    
    def test_verification_creates_user_in_database(self, base_url, unique_email):
        username = generate_unique_username()
        password = "TestPassword123!"
        
        # Register and verify
        _, uuid = register_user(base_url, unique_email, username, password)
        verify_user(base_url, uuid)
        
        # User should be able to login (proves they're in verified users table)
        login_data, token = login_user(base_url, unique_email, password)
        
        assert "token" in login_data
        assert login_data["user"]["email"] == unique_email
        assert login_data["user"]["username"] == username
