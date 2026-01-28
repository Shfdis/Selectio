#!/usr/bin/env python3

import pytest
import requests
import uuid as uuid_lib
from helpers import (
    register_user, register_user_and_get_uuid, verify_user, login_user, identify_user,
    register_and_verify_user, register_verify_and_login,
    generate_unique_email, generate_unique_username, get_verification_uuid_from_db
)


class TestAuthService:
    def test_health_check(self, base_url):
        response = requests.get(f"{base_url}/", timeout=5)
        # Service should respond (even if 404)
        assert response.status_code in [200, 404, 401]
    
    def test_register_user(self, base_url, unique_email):
        user_data = {
            "email": unique_email,
            "username": f"testuser_{uuid_lib.uuid4().hex[:8]}",
            "password": "SecurePassword123!",
            "description": "Test user description"
        }
        
        response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify UUID is NOT in response (security requirement)
        assert "uuid" not in data, "UUID should not be returned in registration response"
        assert "message" in data
        assert "User registration pending email verification" in data["message"]
    
    def test_register_user_duplicate_email(self, base_url, unique_email):
        # First registration
        user_data1 = {
            "email": unique_email,
            "username": f"user1_{uuid_lib.uuid4().hex[:8]}",
            "password": "Password123!",
            "description": "First user"
        }
        
        response1 = requests.post(
            f"{base_url}/user",
            json=user_data1,
            timeout=10
        )
        assert response1.status_code == 200
        
        # Second registration with same email (should still succeed - duplicates allowed in pending)
        user_data2 = {
            "email": unique_email,
            "username": f"user2_{uuid_lib.uuid4().hex[:8]}",
            "password": "AnotherPassword123!",
            "description": "Another user"
        }
        
        response2 = requests.post(
            f"{base_url}/user",
            json=user_data2,
            timeout=10
        )
        
        # Should still succeed (pending emails can have duplicates)
        # The duplicate check happens during verification
        assert response2.status_code == 200
    
    def test_register_user_missing_fields(self, base_url):
        incomplete_data = {
            "email": f"incomplete_{uuid_lib.uuid4().hex[:8]}@example.com",
            "username": "incomplete"
            # Missing password and description
        }
        
        response = requests.post(
            f"{base_url}/user",
            json=incomplete_data,
            timeout=10
        )
        
        # ASP.NET Core should return 400 Bad Request for missing required fields
        # However, if the model allows nulls, it might return 200
        # Let's check for either 400 or 500 (server error) or 200 (if validation is lenient)
        assert response.status_code in [400, 500], f"Expected 400 or 500, got {response.status_code}: {response.text}"
    
    def test_verify_user_with_uuid(self, base_url, unique_email):
        # Register a user first
        user_data = {
            "email": unique_email,
            "username": f"verifyuser_{uuid_lib.uuid4().hex[:8]}",
            "password": "VerifyPassword123!",
            "description": "User to verify"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200
        # Get UUID from database instead of response
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Now verify
        response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "User verified and created successfully" in data["message"]
    
    def test_verify_user_invalid_uuid(self, base_url):
        invalid_uuid = "00000000-0000-0000-0000-000000000000"
        response = requests.post(
            f"{base_url}/user/verify/{invalid_uuid}",
            timeout=10
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "message" in data
        assert "Invalid verification UUID" in data["message"]
    
    def test_verify_duplicate_user(self, base_url, unique_email):
        # Register and verify first user
        user_data1 = {
            "email": unique_email,
            "username": f"duplicateuser1_{uuid_lib.uuid4().hex[:8]}",
            "password": "Password123!",
            "description": "Duplicate test user"
        }
        
        reg_response1 = requests.post(
            f"{base_url}/user",
            json=user_data1,
            timeout=10
        )
        assert reg_response1.status_code == 200
        # Get UUID from database
        uuid1 = get_verification_uuid_from_db(unique_email)
        
        # Verify first time - should succeed
        verify_response1 = requests.post(
            f"{base_url}/user/verify/{uuid1}",
            timeout=10
        )
        assert verify_response1.status_code == 200, f"First verification failed: {verify_response1.text}"
        
        # Register another user with same email
        user_data2 = {
            "email": unique_email,
            "username": f"duplicateuser2_{uuid_lib.uuid4().hex[:8]}",
            "password": "Password456!",
            "description": "Another duplicate"
        }
        
        reg_response2 = requests.post(
            f"{base_url}/user",
            json=user_data2,
            timeout=10
        )
        assert reg_response2.status_code == 200
        # Get UUID from database for second registration
        uuid2 = get_verification_uuid_from_db(unique_email)
        
        # Try to verify second time - should fail with duplicate
        verify_response2 = requests.post(
            f"{base_url}/user/verify/{uuid2}",
            timeout=10
        )
        assert verify_response2.status_code == 400, f"Expected 400 for duplicate, got {verify_response2.status_code}: {verify_response2.text}"
        data = verify_response2.json()
        assert "already exists" in data["message"].lower()
    
    def test_login_success(self, base_url, unique_email):
        # First register and verify a user
        username = f"loginuser_{uuid_lib.uuid4().hex[:8]}"
        password = "SecurePassword123!"
        
        user_data = {
            "email": unique_email,
            "username": username,
            "password": password,
            "description": "User for login test"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200
        # Get UUID from database
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Verify the user
        verify_response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        assert verify_response.status_code == 200
        
        # Now try to login
        login_data = {
            "email": unique_email,
            "password": password
        }
        
        response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "expiresAt" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["username"] == username
    
    def test_login_invalid_email(self, base_url):
        login_data = {
            "email": "nonexistent@example.com",
            "password": "SomePassword123!"
        }
        
        response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        
        assert response.status_code == 401
    
    def test_login_invalid_password(self, base_url, unique_email):
        # First register and verify a user
        username = f"invalidpassuser_{uuid_lib.uuid4().hex[:8]}"
        correct_password = "CorrectPassword123!"
        
        user_data = {
            "email": unique_email,
            "username": username,
            "password": correct_password,
            "description": "User for invalid password test"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200
        # Get UUID from database
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Verify the user
        verify_response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        assert verify_response.status_code == 200
        
        # Now try to login with wrong password
        login_data = {
            "email": unique_email,
            "password": "WrongPassword123!"
        }
        
        response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    
    def test_identify_user_with_token(self, base_url, unique_email):
        # Register, verify, and login to get a token
        username = f"identifyuser_{uuid_lib.uuid4().hex[:8]}"
        password = "IdentifyPassword123!"
        
        user_data = {
            "email": unique_email,
            "username": username,
            "password": password,
            "description": "User for identify test"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200
        # Get UUID from database
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Verify
        verify_response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        assert verify_response.status_code == 200
        
        # Login to get token
        login_data = {
            "email": unique_email,
            "password": password
        }
        
        login_response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Now identify
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        response = requests.get(
            f"{base_url}/user/identify",
            headers=headers,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["email"] == unique_email
        assert data["username"] == username
        assert "description" in data
    
    def test_identify_user_without_token(self, base_url):
        response = requests.get(
            f"{base_url}/user/identify",
            timeout=10
        )
        
        assert response.status_code == 401
    
    def test_identify_user_with_invalid_token(self, base_url):
        headers = {
            "Authorization": "Bearer invalid_token_here"
        }
        
        response = requests.get(
            f"{base_url}/user/identify",
            headers=headers,
            timeout=10
        )
        
        assert response.status_code == 401
    
    def test_full_user_flow(self, base_url, unique_email):
        username = f"flowuser_{uuid_lib.uuid4().hex[:8]}"
        password = "FlowPassword123!"
        
        # Register
        user_data = {
            "email": unique_email,
            "username": username,
            "password": password,
            "description": "Full flow test user"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        # Get UUID from database
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Verify
        verify_response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        
        # Login
        login_data = {
            "email": unique_email,
            "password": password
        }
        
        login_response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["token"]
        
        # Identify
        headers = {"Authorization": f"Bearer {token}"}
        identify_response = requests.get(
            f"{base_url}/user/identify",
            headers=headers,
            timeout=10
        )
        assert identify_response.status_code == 200, f"Identify failed: {identify_response.text}"
        user_info = identify_response.json()
        assert user_info["email"] == unique_email
        assert user_info["username"] == username
    
    def test_delete_user_success(self, base_url, unique_email):
        # Register, verify, and login to get a token
        username = f"deleteuser_{uuid_lib.uuid4().hex[:8]}"
        password = "DeletePassword123!"
        
        user_data = {
            "email": unique_email,
            "username": username,
            "password": password,
            "description": "User to be deleted"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200
        # Get UUID from database
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Verify
        verify_response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        assert verify_response.status_code == 200
        
        # Login to get token
        login_data = {
            "email": unique_email,
            "password": password
        }
        
        login_response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Delete user
        headers = {"Authorization": f"Bearer {token}"}
        delete_response = requests.delete(
            f"{base_url}/user/delete",
            headers=headers,
            timeout=10
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        data = delete_response.json()
        assert "message" in data
        assert "deleted successfully" in data["message"].lower()
    
    def test_delete_user_without_token(self, base_url):
        response = requests.delete(
            f"{base_url}/user/delete",
            timeout=10
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    
    def test_delete_user_with_invalid_token(self, base_url):
        headers = {
            "Authorization": "Bearer invalid_token_here"
        }
        
        response = requests.delete(
            f"{base_url}/user/delete",
            headers=headers,
            timeout=10
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    
    def test_delete_user_cannot_login_after_deletion(self, base_url, unique_email):
        # Register, verify, login, then delete
        username = f"deletedlogin_{uuid_lib.uuid4().hex[:8]}"
        password = "DeleteLogin123!"
        
        user_data = {
            "email": unique_email,
            "username": username,
            "password": password,
            "description": "User for deletion login test"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200
        # Get UUID from database
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Verify
        verify_response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        assert verify_response.status_code == 200
        
        # Login to get token
        login_data = {
            "email": unique_email,
            "password": password
        }
        
        login_response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Delete user
        headers = {"Authorization": f"Bearer {token}"}
        delete_response = requests.delete(
            f"{base_url}/user/delete",
            headers=headers,
            timeout=10
        )
        assert delete_response.status_code == 200
        
        # Try to login again - should fail
        login_response2 = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        assert login_response2.status_code == 401, f"Expected 401 after deletion, got {login_response2.status_code}: {login_response2.text}"
    
    def test_delete_user_cannot_identify_after_deletion(self, base_url, unique_email):
        # Register, verify, login, then delete
        username = f"deletedidentify_{uuid_lib.uuid4().hex[:8]}"
        password = "DeleteIdentify123!"
        
        user_data = {
            "email": unique_email,
            "username": username,
            "password": password,
            "description": "User for deletion identify test"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200
        # Get UUID from database
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Verify
        verify_response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        assert verify_response.status_code == 200
        
        # Login to get token
        login_data = {
            "email": unique_email,
            "password": password
        }
        
        login_response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Delete user
        headers = {"Authorization": f"Bearer {token}"}
        delete_response = requests.delete(
            f"{base_url}/user/delete",
            headers=headers,
            timeout=10
        )
        assert delete_response.status_code == 200
        
        # Try to identify again - should fail (user not found or unauthorized)
        identify_response = requests.get(
            f"{base_url}/user/identify",
            headers=headers,
            timeout=10
        )
        # Should return 401 (unauthorized) or 404 (not found)
        assert identify_response.status_code in [401, 404], f"Expected 401 or 404 after deletion, got {identify_response.status_code}: {identify_response.text}"
    
    def test_delete_user_full_flow(self, base_url, unique_email):
        username = f"fullflowdelete_{uuid_lib.uuid4().hex[:8]}"
        password = "FullFlowDelete123!"
        
        # Register
        user_data = {
            "email": unique_email,
            "username": username,
            "password": password,
            "description": "Full flow with deletion test"
        }
        
        reg_response = requests.post(
            f"{base_url}/user",
            json=user_data,
            timeout=10
        )
        assert reg_response.status_code == 200
        # Get UUID from database
        verification_uuid = get_verification_uuid_from_db(unique_email)
        
        # Verify
        verify_response = requests.post(
            f"{base_url}/user/verify/{verification_uuid}",
            timeout=10
        )
        assert verify_response.status_code == 200
        
        # Login
        login_data = {
            "email": unique_email,
            "password": password
        }
        
        login_response = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Identify (verify user exists)
        headers = {"Authorization": f"Bearer {token}"}
        identify_response = requests.get(
            f"{base_url}/user/identify",
            headers=headers,
            timeout=10
        )
        assert identify_response.status_code == 200
        user_info = identify_response.json()
        assert user_info["email"] == unique_email
        
        # Delete user
        delete_response = requests.delete(
            f"{base_url}/user/delete",
            headers=headers,
            timeout=10
        )
        assert delete_response.status_code == 200
        
        # Verify deletion: try to login (should fail)
        login_response2 = requests.post(
            f"{base_url}/user/verify",
            json=login_data,
            timeout=10
        )
        assert login_response2.status_code == 401
        
        # Verify deletion: try to identify (should fail)
        identify_response2 = requests.get(
            f"{base_url}/user/identify",
            headers=headers,
            timeout=10
        )
        assert identify_response2.status_code in [401, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
