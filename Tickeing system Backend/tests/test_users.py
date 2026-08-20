"""User management tests."""
import pytest


@pytest.mark.asyncio
async def test_admin_creates_agent_and_customer(client, admin_auth):
    r = await client.post(
        "/api/v1/users",
        json={
            "email": "carla.customer@example.com",
            "password": "StrongPass1!",
            "full_name": "Carla Customer",
            "role": "CUSTOMER",
        },
        headers=admin_auth,
    )
    assert r.status_code == 201
    assert r.json()["role"] == "CUSTOMER"

    r = await client.post(
        "/api/v1/users",
        json={
            "email": "alex.agent@example.com",
            "password": "AgentPass1!",
            "full_name": "Alex Agent",
            "role": "AGENT",
        },
        headers=admin_auth,
    )
    assert r.status_code == 201
    assert r.json()["role"] == "AGENT"


@pytest.mark.asyncio
async def test_admin_updates_user_role(client, admin_auth):
    r = await client.post(
        "/api/v1/users",
        json={
            "email": "promote.me@example.com",
            "password": "Pass1234!",
            "full_name": "Promote Me",
            "role": "CUSTOMER",
        },
        headers=admin_auth,
    )
    uid = r.json()["id"]
    r = await client.patch(
        f"/api/v1/users/{uid}", json={"role": "AGENT"}, headers=admin_auth
    )
    assert r.status_code == 200
    assert r.json()["role"] == "AGENT"


@pytest.mark.asyncio
async def test_admin_resets_password(client, admin_auth):
    r = await client.post(
        "/api/v1/users",
        json={
            "email": "reset.me@example.com",
            "password": "OldPass1234!",
            "full_name": "Reset Me",
            "role": "CUSTOMER",
        },
        headers=admin_auth,
    )
    uid = r.json()["id"]
    r = await client.post(
        f"/api/v1/users/{uid}/password",
        json={"new_password": "NewPass1234!"},
        headers=admin_auth,
    )
    assert r.status_code == 200
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "reset.me@example.com", "password": "NewPass1234!"},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_customer_cannot_create_user(client, customer_auth):
    r = await client.post(
        "/api/v1/users",
        json={
            "email": "blocked.attempt@example.com",
            "password": "Pass1234!",
            "full_name": "X",
            "role": "AGENT",
        },
        headers=customer_auth,
    )
    assert r.status_code == 403