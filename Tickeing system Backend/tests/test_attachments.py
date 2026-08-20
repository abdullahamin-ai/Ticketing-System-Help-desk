"""Attachment upload / download tests."""
import io
import pytest


@pytest.mark.asyncio
async def test_upload_and_download_attachment(client, customer_auth, admin_auth):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Attach", "description": "need to send file"},
        headers=customer_auth,
    )
    tid = r.json()["id"]
    content = b"hello attachment world"
    files = {"files": ("hello.txt", io.BytesIO(content), "text/plain")}
    r = await client.post(
        f"/api/v1/tickets/{tid}/messages",
        data={"body": "see attached", "is_internal_note": "false"},
        files=files,
        headers=customer_auth,
    )
    assert r.status_code == 201, r.text
    msg = r.json()
    assert len(msg["attachments"]) == 1
    att_id = msg["attachments"][0]["id"]

    r = await client.get(f"/api/v1/attachments/{att_id}", headers=customer_auth)
    assert r.status_code == 200
    assert r.content == content


@pytest.mark.asyncio
async def test_disallowed_mime_rejected(client, customer_auth):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Attach", "description": "bad file test"},
        headers=customer_auth,
    )
    tid = r.json()["id"]
    files = {"files": ("bad.bin", io.BytesIO(b"\\x00\\x01\\x02"), "application/octet-stream")}
    r = await client.post(
        f"/api/v1/tickets/{tid}/messages",
        data={"body": "x", "is_internal_note": "false"},
        files=files,
        headers=customer_auth,
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_other_customer_cannot_download(client, customer_auth, other_customer_auth):
    r = await client.post(
        "/api/v1/tickets",
        json={"subject": "Private", "description": "private details"},
        headers=customer_auth,
    )
    tid = r.json()["id"]
    files = {"files": ("a.txt", io.BytesIO(b"data"), "text/plain")}
    r = await client.post(
        f"/api/v1/tickets/{tid}/messages",
        data={"body": "x", "is_internal_note": "false"},
        files=files,
        headers=customer_auth,
    )
    att_id = r.json()["attachments"][0]["id"]
    r = await client.get(f"/api/v1/attachments/{att_id}", headers=other_customer_auth)
    assert r.status_code == 403