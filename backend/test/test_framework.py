#!/usr/bin/env python3

import subprocess
import time
import sys
import signal
import os
import requests
from typing import Optional, List
from pathlib import Path


class DockerComposeTestFramework:
    def __init__(self, compose_file: str = "docker-compose.yml", project_dir: Optional[Path] = None):
        # Default to parent directory (backend root) where docker-compose.yml is located
        self.project_dir = project_dir or Path(__file__).parent.parent

        # Allow overriding compose file for split pipelines.
        compose_file = os.environ.get("SELECTIO_COMPOSE_FILE", compose_file)
        # Compose file should be relative to project_dir
        if not Path(compose_file).is_absolute():
            self.compose_file = str(Path(self.project_dir) / compose_file)
        else:
            self.compose_file = compose_file
        self.process: Optional[subprocess.Popen] = None
        # Services expected in the single-Postgres setup
        self.services = ["gateway", "postgres", "auth", "crud", "minio", "image-service"]
        
    def _run_compose_command(self, command: List[str], check: bool = True) -> subprocess.CompletedProcess:
        cmd = ["docker", "compose", "-f", self.compose_file] + command
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_dir,
                capture_output=True,
                text=True,
                check=check
            )
        except FileNotFoundError:
            # Docker not found
            result = subprocess.CompletedProcess(
                cmd, 1, "", "docker: command not found. Is Docker installed and in PATH?"
            )
        return result
    
    def start(self, detach: bool = True, build: bool = False) -> bool:
        try:
            cmd = ["up"]
            if detach:
                cmd.append("-d")
            if build:
                cmd.append("--build")
                
            print(f"Starting docker-compose services...")
            result = self._run_compose_command(cmd, check=False)
            
            if result.returncode == 0:
                print("✓ Services started successfully")
                return True
            else:
                print(f"✗ Failed to start services (exit code {result.returncode}):")
                if result.stdout:
                    print(f"  stdout: {result.stdout[-500:]}")  # Last 500 chars
                if result.stderr:
                    print(f"  stderr: {result.stderr[-500:]}")  # Last 500 chars
                return False
        except Exception as e:
            print(f"✗ Error starting services: {e}")
            return False
    
    def stop(self, remove_volumes: bool = False) -> bool:
        try:
            cmd = ["down"]
            if remove_volumes:
                cmd.append("-v")
                
            print(f"Stopping docker-compose services...")
            result = self._run_compose_command(cmd)
            
            if result.returncode == 0:
                print("✓ Services stopped successfully")
                return True
            else:
                print(f"✗ Failed to stop services: {result.stderr}")
                return False
        except subprocess.CalledProcessError as e:
            print(f"✗ Error stopping services: {e}")
            return False
    
    def restart(self, build: bool = False) -> bool:
        if not self.stop():
            return False
        time.sleep(2)  # Brief pause between stop and start
        return self.start(build=build)
    
    def wait_for_services(self, timeout: int = 120, check_health: bool = True) -> bool:
        print("Waiting for services to be ready...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if check_health:
                if self._check_all_services_healthy():
                    print("✓ All services are healthy")
                    return True
            else:
                if self._check_all_services_running():
                    print("✓ All services are running")
                    return True
            
            time.sleep(2)
        
        print(f"✗ Timeout waiting for services (>{timeout}s)")
        return False
    
    def _check_all_services_running(self) -> bool:
        try:
            result = self._run_compose_command(["ps", "-q"], check=False)
            if result.returncode != 0:
                return False
            
            running_containers = result.stdout.strip().split('\n')
            return len([c for c in running_containers if c]) >= len(self.services)
        except Exception:
            return False
    
    def _check_all_services_healthy(self) -> bool:
        try:
            result = self._run_compose_command(["ps", "--format", "json"], check=False)
            if result.returncode != 0:
                return False
            
            import json
            containers = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    try:
                        containers.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            
            # Check postgres health
            postgres_healthy = any(
                c.get('Service') == 'postgres' and 
                c.get('Health') == 'healthy' 
                for c in containers
            )

            # Check auth service is running
            auth_running = any(
                c.get('Service') == 'auth' and 
                c.get('State') == 'running'
                for c in containers
            )

            # Check crud service is running
            crud_running = any(
                c.get('Service') == 'crud' and
                c.get('State') == 'running'
                for c in containers
            )

            # Check gateway service is running
            gateway_running = any(
                c.get('Service') == 'gateway' and
                c.get('State') == 'running'
                for c in containers
            )

            minio_running = any(
                c.get('Service') == 'minio' and c.get('State') == 'running'
                for c in containers
            )

            image_service_running = any(
                c.get('Service') == 'image-service' and c.get('State') == 'running'
                for c in containers
            )
            
            return (
                postgres_healthy
                and auth_running
                and crud_running
                and gateway_running
                and minio_running
                and image_service_running
            )
        except Exception as e:
            print(f"Error checking service health: {e}")
            return False

    def wait_for_gateway(self, url: str = "http://localhost:8080", timeout: int = 60) -> bool:
        health_url = f"{url}/health"
        print(f"Waiting for gateway at {health_url}...")
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                response = requests.get(health_url, timeout=2)
                if response.status_code == 200:
                    print("✓ Gateway is responding")
                    return True
            except requests.exceptions.RequestException:
                pass

            time.sleep(2)

        print(f"✗ Timeout waiting for gateway (>{timeout}s)")
        return False
    
    def wait_for_auth_service(self, url: str = "http://localhost:8080", timeout: int = 60) -> bool:
        print(f"Waiting for auth service at {url}...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = requests.get(url, timeout=2)
                if response.status_code in [200, 404, 401]:  # Any response means service is up
                    print(f"✓ Auth service is responding")
                    return True
            except requests.exceptions.RequestException:
                pass
            
            time.sleep(2)
        
        print(f"✗ Timeout waiting for auth service (>{timeout}s)")
        return False

    def wait_for_crud_service(self, url: str = "http://localhost:8090", timeout: int = 60) -> bool:
        health_url = f"{url}/health"
        print(f"Waiting for crud service at {health_url}...")
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                response = requests.get(health_url, timeout=2)
                if response.status_code == 200:
                    print("✓ Crud service is responding")
                    return True
            except requests.exceptions.RequestException:
                pass

            time.sleep(2)

        print(f"✗ Timeout waiting for crud service (>{timeout}s)")
        return False
    
    def get_logs(self, service: Optional[str] = None, tail: int = 100) -> str:
        cmd = ["logs", "--tail", str(tail)]
        if service:
            cmd.append(service)
        
        result = self._run_compose_command(cmd, check=False)
        return result.stdout
    
    def get_status(self) -> dict:
        try:
            result = self._run_compose_command(["ps", "--format", "json"], check=False)
            if result.returncode != 0:
                return {"error": "Failed to get status"}
            
            import json
            services = {}
            for line in result.stdout.strip().split('\n'):
                if line:
                    try:
                        container = json.loads(line)
                        service_name = container.get('Service', 'unknown')
                        services[service_name] = {
                            'state': container.get('State', 'unknown'),
                            'health': container.get('Health', 'N/A'),
                            'ports': container.get('Publishers', [])
                        }
                    except json.JSONDecodeError:
                        continue
            
            return services
        except Exception as e:
            return {"error": str(e)}


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Docker Compose Test Framework")
    parser.add_argument(
        "action",
        choices=["start", "stop", "restart", "status", "logs", "wait"],
        help="Action to perform"
    )
    parser.add_argument(
        "--build",
        action="store_true",
        help="Build images before starting"
    )
    parser.add_argument(
        "--remove-volumes",
        action="store_true",
        help="Remove volumes when stopping"
    )
    parser.add_argument(
        "--service",
        help="Service name for logs command"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=120,
        help="Timeout in seconds for wait command"
    )
    parser.add_argument(
        "--compose-file",
        default="docker-compose.yml",
        help="Path to docker-compose file relative to project root (default: docker-compose.yml)"
    )
    
    args = parser.parse_args()
    
    framework = DockerComposeTestFramework(compose_file=args.compose_file)
    
    if args.action == "start":
        success = framework.start(build=args.build)
        if success:
            # Wait for services to be ready
            if framework.wait_for_services(timeout=args.timeout):
                framework.wait_for_auth_service(timeout=args.timeout)
                framework.wait_for_crud_service(timeout=args.timeout)
        sys.exit(0 if success else 1)
    
    elif args.action == "stop":
        success = framework.stop(remove_volumes=args.remove_volumes)
        sys.exit(0 if success else 1)
    
    elif args.action == "restart":
        success = framework.restart(build=args.build)
        if success:
            if framework.wait_for_services(timeout=args.timeout):
                framework.wait_for_auth_service(timeout=args.timeout)
                framework.wait_for_crud_service(timeout=args.timeout)
        sys.exit(0 if success else 1)
    
    elif args.action == "status":
        status = framework.get_status()
        import json
        print(json.dumps(status, indent=2))
        sys.exit(0)
    
    elif args.action == "logs":
        logs = framework.get_logs(service=args.service)
        print(logs)
        sys.exit(0)
    
    elif args.action == "wait":
        success = framework.wait_for_services(timeout=args.timeout)
        if success:
            framework.wait_for_auth_service(timeout=args.timeout)
            framework.wait_for_crud_service(timeout=args.timeout)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
