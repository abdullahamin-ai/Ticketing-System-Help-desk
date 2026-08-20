"""Authentication API tests."""

import pytest


@pytest.mark.asyncio
async def test_register_creates_customer(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newcustomer@example.com",
            "password": "StrongPass1!",
            "full_name": "New Customer",
        },
    )

    assert r.status_code == 201, r.text

    data = r.json()

    assert data["email"] == "newcustomer@example.com"
    assert data["role"] == "CUSTOMER"
    assert data["is_active"] is True

    assert "hashed_password" not in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client, customer_auth):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "alice.customer@example.com",
            "password": "AnotherPass1!",
            "full_name": "Dupe",
        },
    )

    assert r.status_code == 409, r.text


@pytest.mark.asyncio
async def test_register_validation_short_password(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "shortpassword@example.com",
            "password": "short",
            "full_name": "X",
        },
    )

    assert r.status_code == 422, r.text


@pytest.mark.asyncio
async def test_login_success_and_me(client, customer_auth):
    r = await client.get(
        "/api/v1/users/me",
        headers=customer_auth,
    )

    assert r.status_code == 200, r.text
    assert r.json()["email"] == "alice.customer@example.com"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    r = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "alice.customer@example.com",
            "password": "wrong",
        },
    )

    assert r.status_code == 401, r.text


@pytest.mark.asyncio
async def test_login_inactive_user(client, admin_auth):
    r = await client.post(
        "/api/v1/users",
        json={
            "email": "inactive@example.com",
            "password": "WillDeactivate1!",
            "full_name": "Will Deactivate",
            "role": "CUSTOMER",
        },
        headers=admin_auth,
    )

    assert r.status_code == 201, r.text

    user_id = r.json()["id"]

    r = await client.patch(
        f"/api/v1/users/{user_id}",
        json={"is_active": False},
        headers=admin_auth,
    )

    assert r.status_code == 200, r.text

    r = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "inactive@example.com",
            "password": "WillDeactivate1!",
        },
    )

    assert r.status_code == 401, r.text


@pytest.mark.asyncio
async def test_token_required(client):
    r = await client.get("/api/v1/users/me")

    assert r.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token(client):
    r = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalid"},
    )

    assert r.status_code == 401


@pytest.mark.asyncio
async def test_change_own_password(client, customer_auth):
    r = await client.post(
        "/api/v1/users/me/password",
        json={
            "current_password": "CustomerPass1!",
            "new_password": "NewPass1234",
        },
        headers=customer_auth,
    )

    assert r.status_code == 200, r.text

    r = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "alice.customer@example.com",
            "password": "NewPass1234",
        },
    )

    assert r.status_code == 200, r.text