"""Analytics tests."""
import pytest


@pytest.mark.asyncio
async def test_analytics_summary_for_admin(client, admin_auth, customer_auth):
    await client.post(
        "/api/v1/tickets",
        json={"subject": "Analytics one", "description": "details", "priority": "LOW"},
        headers=customer_auth,
    )
    await client.post(
        "/api/v1/tickets",
        json={"subject": "Analytics two", "description": "details", "priority": "URGENT"},
        headers=customer_auth,
    )
    r = await client.get("/api/v1/analytics/tickets", headers=admin_auth)
    assert r.status_code == 200
    body = r.json()
    assert body["total_tickets"] == 2
    assert body["open"] == 2


@pytest.mark.asyncio
async def test_analytics_forbidden_for_customer(client, customer_auth):
    r = await client.get("/api/v1/analytics/tickets", headers=customer_auth)
    assert r.status_code == 403