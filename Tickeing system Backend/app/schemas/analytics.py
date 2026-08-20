"""Analytics schemas."""
from pydantic import BaseModel

from app.core.enums import TicketPriority, TicketStatus
from app.schemas.common import ORMBase


class CountByStatus(BaseModel):
    status: TicketStatus
    count: int


class CountByPriority(BaseModel):
    priority: TicketPriority
    count: int


class CountByCategory(BaseModel):
    category_id: int | None
    category_name: str | None
    count: int


class CountByAgent(BaseModel):
    agent_id: int | None
    agent_name: str | None
    count: int


class TicketAnalytics(ORMBase):
    total_tickets: int
    open: int
    in_progress: int
    waiting_for_customer: int
    resolved: int
    closed: int
    average_resolution_hours: float | None
    by_priority: list[CountByPriority]
    by_category: list[CountByCategory]
    by_agent: list[CountByAgent]
