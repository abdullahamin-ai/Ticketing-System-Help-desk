"""Security / edge case tests."""
import pytest
import jwt as pyjwt
from app.core.config import settings


@pytest.mark.asyncio
async def test_password_hash_not_exposed(client, customer_auth):
    r = await client.get("/api/v1/users/me", headers=customer_auth)
    assert "hashed_password" not in r.json()
    assert "password" not in r.json()


@pytest.mark.asyncio
async def test_jwt_contains_only_expected_claims(client, customer_auth):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice.customer@example.com", "password": "CustomerPass1!"},
    )
    token = r.json()["access_token"]
    payload = pyjwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert payload["type"] == "access"
    assert "sub" in payload
    assert payload["role"] == "CUSTOMER"


@pytest.mark.asyncio
async def test_rbac_admin_only_endpoints_forbidden_for_customer(client, customer_auth):
    r = await client.get("/api/v1/users", headers=customer_auth)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_list_users(client, admin_auth):
    r = await client.get("/api/v1/users", headers=admin_auth)
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "total" in body