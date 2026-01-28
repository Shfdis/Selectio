#!/usr/bin/env python3

import pytest
import uuid as uuid_lib
import os
from test_framework import DockerComposeTestFramework


@pytest.fixture(scope="session", autouse=True)
def setup_services():
    compose_file = os.environ.get("SELECTIO_COMPOSE_FILE", "docker-compose.yml")
    framework = DockerComposeTestFramework(compose_file=compose_file)
    
    # Start services
    print("\n=== Starting test services ===")
    if not framework.start(build=True):
        pytest.fail("Failed to start docker-compose services")
    
    # Wait for services to be ready
    if not framework.wait_for_services(timeout=120):
        pytest.fail("Services did not become healthy in time")
    
    is_gateway_only = os.path.basename(compose_file) == "docker-compose.gateway.yml"
    if is_gateway_only:
        if not framework.wait_for_gateway(url="http://localhost:8080", timeout=60):
            pytest.fail("Gateway did not become ready in time")
    else:
        if not framework.wait_for_auth_service(url="http://localhost:8080", timeout=60):
            pytest.fail("Auth service did not become ready in time")

        if not framework.wait_for_crud_service(url="http://localhost:8090", timeout=60):
            pytest.fail("Crud service did not become ready in time")
    
    yield framework
    
    # Cleanup: stop services
    print("\n=== Stopping test services ===")
    framework.stop(remove_volumes=False)


@pytest.fixture
def unique_email():
    return f"test_{uuid_lib.uuid4().hex[:8]}@example.com"


@pytest.fixture
def base_url():
    return "http://localhost:8080"


@pytest.fixture
def crud_base_url():
    return "http://localhost:8090"


@pytest.fixture
def gateway_base_url():
    return "http://localhost:8080"
