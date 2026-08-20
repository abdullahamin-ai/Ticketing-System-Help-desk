"""Ticket message schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.attachment import AttachmentRead
from app.schemas.common import ORMBase
from app.schemas.user import UserMinimal


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10_000)
    is_internal_note: bool = False


class MessageUpdate(BaseModel):
    body: str = Field(min_length=1, max_length=10_000)


class MessageRead(ORMBase):
    id: int
    ticket_id: int
    body: str
    is_internal_note: bool
    author: UserMinimal
    created_at: datetime
    updated_at: datetime
    attachments: List[AttachmentRead] = Field(default_factory=list)
