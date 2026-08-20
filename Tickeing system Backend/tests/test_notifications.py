"""Notification tests."""
import pytest


@pytest.mark.asyncio
async def test_admin_receives_notification_on_new_ticket(client, customer_auth, admin_auth):
    await client.post(
        "/api/v1/tickets",
        json={"subject": "Notify", "description": "details"},
        headers=customer_auth,
    )
    r = await client.get("/api/v1/notifications?unread_only=true", headers=admin_auth)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert any(n["type"] == "TICKET_CREATED" for n in body["items"])


@pytest.mark.asyncio
async def test_agent_assigned_receives_notification(
    client, customer_auth, admin_auth, agent_user
):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Assigned notify", "description": "details here"},
        headers=customer_auth,
    )
    tid = r.json()["id"]
    r = await client.get("/api/v1/users?search=anna", headers=admin_auth)
    agent_id = next(u["id"] for u in r.json()["items"] if u["role"] == "AGENT")
    await client.post(
        f"/api/v1/tickets/{tid}/assign",
        json={"agent_id": agent_id},
        headers=admin_auth,
    )
    r = await client.get("/api/v1/notifications?unread_only=true", headers=agent_user)
    assert any(n["type"] == "TICKET_ASSIGNED" for n in r.json()["items"])


@pytest.mark.asyncio
async def test_mark_read(client, customer_auth, admin_auth):
    await client.post(
        "/api/v1/tickets",
        json={"subject": "Mark read", "description": "details here"},
        headers=customer_auth,
    )
    r = await client.get("/api/v1/notifications/unread-count", headers=admin_auth)
    assert r.json()["unread"] >= 1
    r = await client.post(
        "/api/v1/notifications/mark-read", json={}, headers=admin_auth
    )
    assert r.status_code == 200
    r = await client.get("/api/v1/notifications/unread-count", headers=admin_auth)
    assert r.json()["unread"] == 0