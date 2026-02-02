#!/usr/bin/env python3

import requests
import uuid as uuid_lib
import subprocess
from typing import Dict, Optional, Tuple


def get_verification_uuid_from_db(
    email: str,
    container_name: str = "selectio_postgres",
    db_name: str = "selectio_main",
    max_retries: int = 3,
) -> str:
    import time

    # Escape single quotes in email for SQL query
    escaped_email = email.replace("'", "''")

    # Execute psql query via docker exec with retry
    for attempt in range(max_retries):
        try:
            cmd = [
                "docker",
                "exec",
                container_name,
                "psql",
                "-U",
                "postgres",
                "-d",
                db_name,
                "-t",
                "-A",
                "-c",
                f'SELECT "Uuid" FROM auth.pending_emails WHERE "Email" = \'{escaped_email}\';',
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10,
                check=True,
            )

            uuid_str = result.stdout.strip()

            if uuid_str:
                uuids = [u.strip() for u in uuid_str.split("\n") if u.strip()]
                if len(uuids) > 1:
                    raise RuntimeError(
                        f"Multiple pending emails found for {email}. Data inconsistency detected."
                    )
                return uuids[0]

            if attempt < max_retries - 1:
                time.sleep(0.2 * (attempt + 1))
                continue

            raise ValueError(f"No pending email verification found for email: {email}")

        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else e.stdout.strip() if e.stdout else str(e)
            if attempt < max_retries - 1 and (
                "No such file" not in error_msg and "does not exist" not in error_msg
            ):
                time.sleep(0.2 * (attempt + 1))
                continue
            raise RuntimeError(
                f"Failed to query database (attempt {attempt + 1}/{max_retries}): {error_msg}"
            ) from e
        except subprocess.TimeoutExpired:
            if attempt < max_retries - 1:
                continue
            raise RuntimeError("Database query timed out after all retries") from None

    raise ValueError(
        f"No pending email verification found for email: {email} after {max_retries} attempts"
    )


def register_user(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Dict:
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


def register_user_and_get_uuid(
    base_url: str,
    email: str,
    username: str,
    password: str,
    description: str = "Test user",
    container_name: str = "selectio_postgres",
    db_name: str = "selectio_main",
) -> Tuple[Dict, str]:
    data = register_user(base_url, email, username, password, description)
    uuid = get_verification_uuid_from_db(email, container_name, db_name)
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


def register_and_verify_user(
    base_url: str,
    email: str,
    username: str,
    password: str,
    description: str = "Test user",
    container_name: str = "selectio_postgres",
    db_name: str = "selectio_main",
) -> Dict:
    _, uuid = register_user_and_get_uuid(
        base_url, email, username, password, description, container_name, db_name
    )
    return verify_user(base_url, uuid)


def register_verify_and_login(base_url: str, email: str, username: str, password: str, description: str = "Test user") -> Tuple[Dict, str]:
    register_and_verify_user(base_url, email, username, password, description)
    return login_user(base_url, email, password)


def generate_unique_email(prefix: str = "test") -> str:
    return f"{prefix}_{uuid_lib.uuid4().hex[:8]}@example.com"


def generate_unique_username(prefix: str = "user") -> str:
    return f"{prefix}_{uuid_lib.uuid4().hex[:8]}"


def seed_crud_books(
    container_name: str = "selectio_postgres",
    db_name: str = "selectio_main",
    title: str = "Gateway test seed book",
    author: str = "Test Author",
) -> None:
    cmd = [
        "docker", "exec", container_name,
        "psql", "-U", "postgres", "-d", db_name, "-c",
        f'INSERT INTO crud."Books" ("Title", "Author", "Description", "Genre", "CoverUrl") '
        f"VALUES ('{title.replace(chr(39), chr(39) + chr(39))}', '{author.replace(chr(39), chr(39) + chr(39))}', '', '', '');"
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=10, check=True)


def cleanup_seeded_books(
    container_name: str = "selectio_postgres",
    db_name: str = "selectio_main",
    title: str = "Gateway test seed book",
) -> None:
    escaped_title = title.replace("'", "''")
    cmd = [
        "docker", "exec", container_name,
        "psql", "-U", "postgres", "-d", db_name, "-c",
        f'DELETE FROM crud."Books" WHERE "Title" = \'{escaped_title}\';'
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=10, check=True)
