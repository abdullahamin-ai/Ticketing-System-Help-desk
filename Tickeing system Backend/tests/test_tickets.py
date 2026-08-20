"""Ticket tests."""
import pytest


@pytest.mark.asyncio
async def test_customer_creates_ticket(client, customer_auth, category_id):
    r = await client.post(
        "/api/v1/tickets",
        json={
            "subject": "Cannot login",
            "description": "I forgot my password and the reset email never arrives.",
            "priority": "HIGH",
            "category_id": category_id,
        },
        headers=customer_auth,
    )
    assert r.status_code == 201, r.text
    t = r.json()
    assert t["number"].startswith("TKT-")
    assert t["status"] == "OPEN"
    assert t["customer"]["email"] == "alice.customer@example.com"


@pytest.mark.asyncio
async def test_customer_cannot_view_other_customers_ticket(
    client, customer_auth, other_customer_auth, category_id
):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "My issue", "description": "details here"},
        headers=customer_auth,
    )
    tid = r.json()["id"]
    r = await client.get(f"/api/v1/tickets/{tid}", headers=other_customer_auth)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_assigns_ticket_to_agent(
    client, customer_auth, admin_auth, agent_user, category_id
):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Need help", "description": "details"},
        headers=customer_auth,
    )
    tid = r.json()["id"]
    r = await client.get("/api/v1/users?search=anna", headers=admin_auth)
    agent_id = next(u["id"] for u in r.json()["items"] if u["role"] == "AGENT")
    r = await client.post(
        f"/api/v1/tickets/{tid}/assign",
        json={"agent_id": agent_id},
        headers=admin_auth,
    )
    assert r.status_code == 200, r.text
    assert r.json()["agent"]["id"] == agent_id


@pytest.mark.asyncio
async def test_agent_cannot_access_unassigned_tickets(
    client, customer_auth, agent_user
):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "unassigned", "description": "..."},
        headers=customer_auth,
    )
    tid = r.json()["id"]
    r = await client.get(f"/api/v1/tickets/{tid}", headers=agent_user)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_status_transitions(
    client, customer_auth, admin_auth, agent_user
):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Lifecycle", "description": "Walk through states"},
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
        f"/api/v1/tickets/{tid}/status",
        json={"status": "IN_PROGRESS"},
        headers=agent_user,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "IN_PROGRESS"

    r = await client.post(
        f"/api/v1/tickets/{tid}/status",
        json={"status": "RESOLVED"},
        headers=agent_user,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "RESOLVED"

    r = await client.post(f"/api/v1/tickets/{tid}/close", headers=customer_auth)
    assert r.status_code == 200
    assert r.json()["status"] == "CLOSED"


@pytest.mark.asyncio
async def test_illegal_transition_rejected(
    client, customer_auth, agent_user, admin_auth
):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Illegal", "description": "..."},
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
        json={"status": "CLOSED"},
        headers=agent_user,
    )
    r = await client.post(
        f"/api/v1/tickets/{tid}/status",
        json={"status": "IN_PROGRESS"},
        headers=agent_user,
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_list_tickets_pagination_and_filter(
    client, customer_auth, other_customer_auth
):
    for i in range(3):
        await client.post(
            "/api/v1/tickets",
            json={"subject": f"Issue {i}", "description": "details"},
            headers=customer_auth,
        )
    r = await client.get("/api/v1/tickets?page=1&page_size=2", headers=customer_auth)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2
    assert body["page"] == 1
    assert body["total_pages"] == 2

    r = await client.get("/api/v1/tickets", headers=other_customer_auth)
    assert r.json()["total"] == 0


@pytest.mark.asyncio
async def test_agent_sees_only_assigned(
    client, customer_auth, agent_user, admin_auth
):
    ids = []
    for i in range(2):
        r = await client.post(
            "/api/v1/tickets",
            json={"subject": f"Ticket {i}", "description": "desc"},
            headers=customer_auth,
        )
        ids.append(r.json()["id"])
    r = await client.get("/api/v1/users?search=anna", headers=admin_auth)
    agent_id = next(u["id"] for u in r.json()["items"] if u["role"] == "AGENT")
    await client.post(
        f"/api/v1/tickets/{ids[0]}/assign",
        json={"agent_id": agent_id},
        headers=admin_auth,
    )
    r = await client.get("/api/v1/tickets", headers=agent_user)
    assert r.json()["total"] == 1

