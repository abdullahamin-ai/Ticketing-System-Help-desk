"""Attachment service: secure file storage and validation."""
import os
import re
import uuid
from pathlib import Path
from typing import Iterable, Sequence

import aiofiles
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.attachment import Attachment
from app.models.ticket import Ticket

_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _sanitize_filename(name: str) -> str:
    name = name.strip().replace("\\x00", "")
    name = name.replace("\\\\", "/").split("/")[-1]
    name = _SAFE_NAME_RE.sub("_", name)
    name = name.strip("._-")
    if not name:
        name = "file"
    if len(name) > 200:
        name = name[:200]
    return name


def _ext_from_content_type(content_type: str) -> str:
    mapping = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "application/pdf": ".pdf",
        "text/plain": ".txt",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/zip": ".zip",
    }
    return mapping.get(content_type, "")


class AttachmentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def _save_file(self, upload: UploadFile, stored_name: str) -> int:
        """Stream the upload to disk, enforcing size limit, return bytes written."""
        size = 0
        path = self.upload_dir / stored_name
        async with aiofiles.open(path, "wb") as out:
            while True:
                chunk = await upload.read(64 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > settings.UPLOAD_MAX_SIZE_BYTES:
                    await out.close()
                    try:
                        os.remove(path)
                    except OSError:
                        pass
                    raise BadRequestError(
                        f"File exceeds maximum size of {settings.UPLOAD_MAX_SIZE_BYTES} bytes"
                    )
                await out.write(chunk)
        await upload.close()
        return size

    async def create_for_ticket(
        self,
        *,
        ticket: Ticket,
        uploader_id: int,
        uploads: Iterable[UploadFile],
    ) -> list[Attachment]:
        created: list[Attachment] = []
        for upload in uploads:
            if not upload.filename:
                continue
            content_type = (upload.content_type or "").lower().split(";")[0].strip()
            if content_type not in settings.UPLOAD_ALLOWED_MIME_TYPES:
                raise BadRequestError(
                    f"File type '{content_type}' is not allowed"
                )

            safe_name = _sanitize_filename(upload.filename)
            ext = _ext_from_content_type(content_type)
            stored_name = f"{uuid.uuid4().hex}{ext}"

            size = await self._save_file(upload, stored_name)

            att = Attachment(
                ticket_id=ticket.id,
                uploader_id=uploader_id,
                filename=safe_name,
                stored_filename=stored_name,
                content_type=content_type,
                size_bytes=size,
            )
            self.db.add(att)
            created.append(att)
        await self.db.flush()
        return created

    async def get_for_ticket(
        self, ticket: Ticket
    ) -> Sequence[Attachment]:
        stmt = (
            select(Attachment)
            .where(Attachment.ticket_id == ticket.id)
            .order_by(Attachment.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, attachment_id: int) -> Attachment:
        att = await self.db.get(Attachment, attachment_id)
        if att is None:
            raise NotFoundError("Attachment not found")
        return att

    def resolve_path(self, attachment: Attachment) -> Path:
        return self.upload_dir / attachment.stored_filename

    async def delete(self, attachment: Attachment) -> None:
        path = self.resolve_path(attachment)
        await self.db.delete(attachment)
        await self.db.flush()
        try:
            os.remove(path)
        except OSError:
            pass
