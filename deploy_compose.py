#!/usr/bin/env python3
"""
Deploy a compose stack to ZaneOps from a YAML file.

Usage:
    python deploy_compose.py <compose_file> --project <project_slug> --env <env_slug> [--slug <stack_slug>] [--base-url <url>]

Example:
    python deploy_compose.py n8n.yml --project my-project --env production --slug n8n-stack
"""

import argparse
import sys
from pathlib import Path
from typing import cast

import requests
import yaml
import dotenv

dotenv.load_dotenv()

import os

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")
PROJECT_SLUG = os.environ.get("PROJECT_SLUG", "compose")
ENV_SLUG = os.environ.get("ENV_SLUG", "production")
USERNAME = os.environ.get("USERNAME", "admin")
PASSWORD = os.environ.get("PASSWORD", "password")


def get_csrf_token(session: requests.Session, base_url: str) -> str:
    """Get CSRF token from the API."""
    resp = session.get(f"{base_url}/api/csrf/")
    resp.raise_for_status()
    return session.cookies.get("csrftoken")  # type: ignore


def login(
    session: requests.Session, base_url: str, username: str, password: str
) -> None:
    """Login and establish session."""
    csrf_token = get_csrf_token(session, base_url)
    resp = session.post(
        f"{base_url}/api/auth/login/",
        json={"username": username, "password": password},
        headers={"X-CSRFToken": csrf_token},
    )
    resp.raise_for_status()
    print(f"Logged in as {username}")


def get_stack(
    session: requests.Session,
    base_url: str,
    project_slug: str,
    env_slug: str,
    stack_slug: str,
) -> dict | None:
    """Get stack details if it exists."""
    resp = session.get(
        f"{base_url}/api/compose/stacks/{project_slug}/{env_slug}/{stack_slug}/",
    )
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def create_stack(
    session: requests.Session,
    base_url: str,
    project_slug: str,
    env_slug: str,
    user_content: str,
    slug: str | None = None,
) -> dict:
    """Create a new compose stack."""
    csrf_token = session.cookies.get("csrftoken")
    payload = {"user_content": user_content}
    if slug:
        payload["slug"] = slug

    resp = session.post(
        f"{base_url}/api/compose/stacks/{project_slug}/{env_slug}/create/",
        json=payload,
        headers={"X-CSRFToken": csrf_token},
    )
    resp.raise_for_status()
    return resp.json()


def update_stack(
    session: requests.Session,
    base_url: str,
    project_slug: str,
    env_slug: str,
    stack_slug: str,
    user_content: str,
) -> dict:
    """Update an existing compose stack."""
    csrf_token = session.cookies.get("csrftoken")
    resp = session.put(
        f"{base_url}/api/compose/stacks/{project_slug}/{env_slug}/{stack_slug}/request-changes/",
        json={
            "field": "compose_content",
            "type": "UPDATE",
            "new_value": user_content,
        },
        headers={"X-CSRFToken": csrf_token},
    )
    resp.raise_for_status()
    return resp.json()


def deploy_stack(
    session: requests.Session,
    base_url: str,
    project_slug: str,
    env_slug: str,
    stack_slug: str,
    commit_message: str = "Deploy from CLI",
) -> dict:
    """Deploy a compose stack."""
    csrf_token = session.cookies.get("csrftoken")
    resp = session.put(
        f"{base_url}/api/compose/stacks/{project_slug}/{env_slug}/{stack_slug}/deploy/",
        json={"commit_message": commit_message},
        headers={"X-CSRFToken": csrf_token},
    )
    resp.raise_for_status()
    return resp.json()


def main():
    parser = argparse.ArgumentParser(description="Deploy a compose stack to ZaneOps")
    parser.add_argument(
        "--file", "-f", type=Path, required=True, help="Path to the compose YAML file"
    )
    parser.add_argument("--project", "-p", default=PROJECT_SLUG, help="Project slug")
    parser.add_argument("--env", "-e", default=ENV_SLUG, help="Environment slug")
    parser.add_argument(
        "--slug", "-s", help="Stack slug (auto-generated if not provided)"
    )
    parser.add_argument(
        "--base-url", "-u", default=BASE_URL, help="ZaneOps API base URL"
    )
    parser.add_argument("--username", default=USERNAME, help="Username for login")
    parser.add_argument("--password", default=PASSWORD, help="Password for login")
    parser.add_argument(
        "--message", "-m", default="Deploy from CLI", help="Deployment commit message"
    )

    args = parser.parse_args()

    file = cast(Path, args.file)
    if not file.exists():
        print(f"Error: File not found: {args.file}", file=sys.stderr)
        sys.exit(1)

    user_content = file.read_text()
    slug = args.slug or file.with_suffix("").name
    print(f"{slug=}")

    session = requests.Session()

    try:
        login(session, args.base_url, args.username, args.password)

        # Check if stack exists
        existing_stack = get_stack(session, args.base_url, args.project, args.env, slug)

        if existing_stack:
            print(f"Stack '{slug}' already exists, updating...")
            update_stack(
                session,
                args.base_url,
                args.project,
                args.env,
                slug,
                user_content,
            )
            stack_slug = existing_stack["slug"]
            stack_id = existing_stack["id"]
            print(f"Stack updated: {stack_slug} (id: {stack_id})")
        else:
            print(f"Creating stack in {args.project}/{args.env}...")
            stack = create_stack(
                session,
                args.base_url,
                args.project,
                args.env,
                user_content,
                slug,
            )
            stack_slug = stack["slug"]
            stack_id = stack["id"]
            print(f"Stack created: {stack_slug} (id: {stack_id})")

        # Deploy
        print("Deploying stack...")
        deployment = deploy_stack(
            session,
            args.base_url,
            args.project,
            args.env,
            stack_slug,
            args.message,
        )
        print(f"Deployment queued: {deployment['hash']}")
        print(f"Status: {deployment['status']}")

        # Print created resources
        snapshot = deployment.get("stack_snapshot", {})

        urls = snapshot.get("urls", {})
        if urls:
            print("\n--- URLs ---")
            for service_name, routes in urls.items():
                for route in routes:
                    domain = route.get("domain", "")
                    base_path = route.get("base_path", "/")
                    port = route.get("port", "")
                    print(
                        f"  {service_name}: http://{domain}{base_path} -> port {port}"
                    )

        configs = snapshot.get("configs", {})
        if configs:
            print("\n--- Configs ---")
            for config_name in configs.keys():
                print(f"  {config_name}")

        # Extract volumes from computed_content if available
        computed_content = snapshot.get("computed_content")
        if computed_content:
            try:
                computed_spec = yaml.safe_load(computed_content)
                volumes = computed_spec.get("volumes", {})
                if volumes:
                    print("\n--- Volumes ---")
                    for volume_name in volumes.keys():
                        print(f"  {volume_name}")
            except yaml.YAMLError:
                pass

        env_overrides = snapshot.get("env_overrides", [])
        if env_overrides:
            print("\n--- Environment Overrides ---")
            for override in env_overrides:
                print(f"    {override['key']}={override['value']}")

    except requests.HTTPError as e:
        print(f"Error: {e}", file=sys.stderr)
        if e.response is not None:
            print(f"Response: {e.response.text}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
