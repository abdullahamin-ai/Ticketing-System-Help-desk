"""Ticket schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.core.enums import TicketPriority, TicketStatus
from app.schemas.common import ORMBase
from app.schemas.user import UserMinimal


class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3, max_length=20_000)
    priority: TicketPriority = TicketPriority.MEDIUM
    category_id: Optional[int] = None


class TicketUpdate(BaseModel):
    subject: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, min_length=3, max_length=20_000)
    priority: Optional[TicketPriority] = None
    category_id: Optional[int] = None


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    note: Optional[str] = Field(default=None, max_length=500)


class TicketAssign(BaseModel):
    agent_id: Optional[int] = None  # null = unassign


class TicketRead(ORMBase):
    id: int
    number: str
    subject: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    customer: UserMinimal
    agent: Optional[UserMinimal] = None
    category_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None


class TicketDetailRead(TicketRead):
    pass


class TicketListItem(ORMBase):
    """Lightweight representation for list endpoints."""
    id: int
    number: str
    subject: str
    status: TicketStatus
    priority: TicketPriority
    customer: UserMinimal
    agent: Optional[UserMinimal] = None
    category_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
