"""Category tests."""
import pytest


@pytest.mark.asyncio
async def test_list_categories_requires_auth(client):
    r = await client.get("/api/v1/categories")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_admin_creates_category(client, admin_auth):
    r = await client.post(
        "/api/v1/categories",
        json={"name": "Billing", "slug": "billing"},
        headers=admin_auth,
    )
    assert r.status_code == 201
    assert r.json()["slug"] == "billing"


@pytest.mark.asyncio
async def test_duplicate_slug_409(client, admin_auth):
    r = await client.post(
        "/api/v1/categories",
        json={"name": "Tech", "slug": "tech"},
        headers=admin_auth,
    )
    assert r.status_code == 201
    r = await client.post(
        "/api/v1/categories",
        json={"name": "Tech2", "slug": "tech"},
        headers=admin_auth,
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_customer_cannot_create_category(client, customer_auth):
    r = await client.post(
        "/api/v1/categories",
        json={"name": "Nope", "slug": "nope"},
        headers=customer_auth,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_invalid_slug_pattern(client, admin_auth):
    r = await client.post(
        "/api/v1/categories",
        json={"name": "Bad", "slug": "Bad Slug!"},
        headers=admin_auth,
    )
    assert r.status_code == 422
