#!/usr/bin/env python3
"""
Test helper utilities
"""

import requests
import uuid as uuid_lib
from typing import Dict, Optional, Tuple


def register_user(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Tuple[Dict, str]:
    """
    Register a new user and return the response and UUID
    
    Returns:
        Tuple of (response_data, verification_uuid)
    """
    user_data = {
        "email": email,
        "username": username,
        "password": password,
        "description": description
    }
    
    response = requests.post(
        f"{base_url}/user",
        json=user_data,
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    return data, data["uuid"]


def verify_user(base_url: str, verification_uuid: str) -> Dict:
    """
    Verify a user with the given UUID
    
    Returns:
        Response data
    """
    response = requests.post(
        f"{base_url}/user/verify/{verification_uuid}",
        timeout=10
    )
    response.raise_for_status()
    return response.json()


def login_user(base_url: str, email: str, password: str) -> Tuple[Dict, str]:
    """
    Login a user and return response data and JWT token
    
    Returns:
        Tuple of (response_data, token)
    """
    login_data = {
        "email": email,
        "password": password
    }
    
    response = requests.post(
        f"{base_url}/user/verify",
        json=login_data,
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    return data, data["token"]


def identify_user(base_url: str, token: str) -> Dict:
    """
    Identify a user with JWT token
    
    Returns:
        User data
    """
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{base_url}/user/identify",
        headers=headers,
        timeout=10
    )
    response.raise_for_status()
    return response.json()


def register_and_verify_user(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Dict:
    """
    Complete flow: register and verify a user
    
    Returns:
        Verification response data
    """
    _, uuid = register_user(base_url, email, username, password, description)
    return verify_user(base_url, uuid)


def register_verify_and_login(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Tuple[Dict, str]:
    """
    Complete flow: register, verify, and login
    
    Returns:
        Tuple of (login_response_data, token)
    """
    register_and_verify_user(base_url, email, username, password, description)
    return login_user(base_url, email, password)


def generate_unique_email(prefix: str = "test") -> str:
    """Generate a unique email address"""
    return f"{prefix}_{uuid_lib.uuid4().hex[:8]}@example.com"


def generate_unique_username(prefix: str = "user") -> str:
    """Generate a unique username"""
    return f"{prefix}_{uuid_lib.uuid4().hex[:8]}"
