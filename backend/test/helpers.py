#!/usr/bin/env python3

import requests
import uuid as uuid_lib
from typing import Dict, Optional, Tuple


def register_user(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Tuple[Dict, str]:
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
    response = requests.post(
        f"{base_url}/user/verify/{verification_uuid}",
        timeout=10
    )
    response.raise_for_status()
    return response.json()


def login_user(base_url: str, email: str, password: str) -> Tuple[Dict, str]:
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
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{base_url}/user/identify",
        headers=headers,
        timeout=10
    )
    response.raise_for_status()
    return response.json()


def register_and_verify_user(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Dict:
    _, uuid = register_user(base_url, email, username, password, description)
    return verify_user(base_url, uuid)


def register_verify_and_login(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Tuple[Dict, str]:
    register_and_verify_user(base_url, email, username, password, description)
    return login_user(base_url, email, password)


def generate_unique_email(prefix: str = "test") -> str:
    return f"{prefix}_{uuid_lib.uuid4().hex[:8]}@example.com"


def generate_unique_username(prefix: str = "user") -> str:
    return f"{prefix}_{uuid_lib.uuid4().hex[:8]}"
