"""Message / reply tests."""
import pytest


@pytest.mark.asyncio
async def test_customer_reply_and_agent_internal_note(
    client, customer_auth, agent_user, admin_auth
):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Need help", "description": "details"},
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

    r = await client.post(
        f"/api/v1/tickets/{tid}/messages",
        data={"body": "Any update?", "is_internal_note": "false"},
        headers=customer_auth,
    )
    assert r.status_code == 201, r.text
    assert r.json()["is_internal_note"] is False

    r = await client.post(
        f"/api/v1/tickets/{tid}/messages",
        data={"body": "Escalating to L2", "is_internal_note": "true"},
        headers=agent_user,
    )
    assert r.status_code == 201
    assert r.json()["is_internal_note"] is True

    r = await client.get(f"/api/v1/tickets/{tid}/messages", headers=customer_auth)
    assert r.status_code == 200
    items = r.json()
    assert all(not m["is_internal_note"] for m in items)

    r = await client.get(f"/api/v1/tickets/{tid}/messages", headers=agent_user)
    assert r.status_code == 200
    assert any(m["is_internal_note"] for m in r.json())


@pytest.mark.asyncio
async def test_customer_cannot_create_internal_note(client, customer_auth):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Test issue", "description": "test details"},
        headers=customer_auth,
    )
    tid = r.json()["id"]
    r = await client.post(
        f"/api/v1/tickets/{tid}/messages",
        data={"body": "secret", "is_internal_note": "true"},
        headers=customer_auth,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_reply_to_closed_ticket_blocked(
    client, customer_auth, agent_user, admin_auth
):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Test issue", "description": "test details"},
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
    await client.post(
        f"/api/v1/tickets/{tid}/status",
        json={"status": "RESOLVED"},
        headers=agent_user,
    )
    await client.post(f"/api/v1/tickets/{tid}/close", headers=customer_auth)
    r = await client.post(
        f"/api/v1/tickets/{tid}/messages",
        data={"body": "still need help", "is_internal_note": "false"},
        headers=customer_auth,
    )
    assert r.status_code == 403