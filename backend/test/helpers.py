#!/usr/bin/env python3

import requests
import uuid as uuid_lib
import subprocess
from typing import Dict, Optional, Tuple


def get_verification_uuid_from_db(email: str, container_name: str = "selectio_auth", max_retries: int = 3) -> str:
    """
    Retrieve the verification UUID from the SQLite database for a given email.
    Uses docker exec to query the database inside the auth container.
    
    Args:
        email: The email address to look up
        container_name: The Docker container name (default: selectio_auth)
        max_retries: Maximum number of retry attempts (default: 3)
    
    Returns:
        The UUID string for the pending email verification
    
    Raises:
        RuntimeError: If docker exec fails or database query fails
        ValueError: If no pending email found for the given email
    """
    import time
    
    # Escape single quotes in email for SQL query
    escaped_email = email.replace("'", "''")
    
    # Execute sqlite3 query via docker exec with retry logic
    for attempt in range(max_retries):
        try:
            # Use sqlite3 with proper formatting - output only the value
            cmd = [
                "docker", "exec", container_name,
                "sqlite3", "-noheader", "/data/pending_emails.db",
                f"SELECT uuid FROM pending_emails WHERE email = '{escaped_email}';"
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10,
                check=True
            )
            
            uuid_str = result.stdout.strip()
            
            if uuid_str:
                # Handle case where multiple rows might be returned (shouldn't happen, but be safe)
                uuids = [u.strip() for u in uuid_str.split('\n') if u.strip()]
                if len(uuids) > 1:
                    raise RuntimeError(f"Multiple pending emails found for {email}. Data inconsistency detected.")
                return uuids[0]
            
            # If no result and not the last attempt, wait and retry
            if attempt < max_retries - 1:
                time.sleep(0.2 * (attempt + 1))  # Exponential backoff: 0.2s, 0.4s, 0.6s
                continue
            
            # Last attempt failed
            raise ValueError(f"No pending email verification found for email: {email}")
            
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else e.stdout.strip() if e.stdout else str(e)
            
            # If it's a "not found" error and not the last attempt, retry
            if attempt < max_retries - 1 and ("No such file" not in error_msg and "does not exist" not in error_msg):
                time.sleep(0.2 * (attempt + 1))
                continue
            
            raise RuntimeError(f"Failed to query database (attempt {attempt + 1}/{max_retries}): {error_msg}") from e
        except subprocess.TimeoutExpired:
            if attempt < max_retries - 1:
                continue
            raise RuntimeError("Database query timed out after all retries") from None
    
    raise ValueError(f"No pending email verification found for email: {email} after {max_retries} attempts")


def register_user(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Dict:
    """
    Register a new user. Returns only the response data (no UUID).
    Use register_user_and_get_uuid() if you need the verification UUID.
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
    return data


def register_user_and_get_uuid(base_url: str, email: str, username: str, password: str, description: str = "Test user", container_name: str = "selectio_auth") -> Tuple[Dict, str]:
    """
    Register a new user and retrieve the verification UUID from the database.
    This is a convenience function for tests that need the UUID immediately.
    The function includes retry logic to handle database write timing.
    """
    data = register_user(base_url, email, username, password, description)
    # get_verification_uuid_from_db has built-in retry logic, so no need for extra sleep
    uuid = get_verification_uuid_from_db(email, container_name)
    return data, uuid


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


def register_and_verify_user(base_url: str, email: str, username: str, password: str, description: str = "Test user", container_name: str = "selectio_auth") -> Dict:
    _, uuid = register_user_and_get_uuid(base_url, email, username, password, description, container_name)
    return verify_user(base_url, uuid)


def register_verify_and_login(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Tuple[Dict, str]:
    register_and_verify_user(base_url, email, username, password, description)
    return login_user(base_url, email, password)


def generate_unique_email(prefix: str = "test") -> str:
    return f"{prefix}_{uuid_lib.uuid4().hex[:8]}@example.com"


def generate_unique_username(prefix: str = "user") -> str:
    return f"{prefix}_{uuid_lib.uuid4().hex[:8]}"
