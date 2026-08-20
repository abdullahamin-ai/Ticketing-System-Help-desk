"""Notification schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.core.enums import NotificationType
from app.schemas.common import ORMBase


class NotificationRead(ORMBase):
    id: int
    type: NotificationType
    title: str
    body: str
    ticket_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationMarkRead(BaseModel):
    ids: Optional[list[int]] = None  # if None, mark all as read
