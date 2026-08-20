"""Attachment schemas."""
from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMBase


class AttachmentRead(ORMBase):
    id: int
    filename: str
    content_type: str
    size_bytes: int
    ticket_id: int
    message_id: int | None = None
    uploader_id: int
    created_at: datetime


class AttachmentDownload(ORMBase):
    id: int
    filename: str
    content_type: str
    size_bytes: int
