"""Ticket model."""
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import TicketPriority, TicketStatus
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.category import Category
    from app.models.message import Message
    from app.models.attachment import Attachment
    from app.models.notification import Notification


class Ticket(Base, TimestampMixin):
    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint("number", name="uq_tickets_number"),
        Index("ix_tickets_status_priority", "status", "priority"),
        Index("ix_tickets_customer", "customer_id"),
        Index("ix_tickets_agent", "agent_id"),
        Index("ix_tickets_category", "category_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status", length=30),
        nullable=False,
        default=TicketStatus.OPEN,
        index=True,
    )
    priority: Mapped[TicketPriority] = mapped_column(
        Enum(TicketPriority, name="ticket_priority", length=20),
        nullable=False,
        default=TicketPriority.MEDIUM,
        index=True,
    )

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    agent_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    customer: Mapped["User"] = relationship(
        back_populates="tickets_created",
        foreign_keys=[customer_id],
    )
    agent: Mapped[Optional["User"]] = relationship(
        back_populates="tickets_assigned",
        foreign_keys=[agent_id],
    )
    category: Mapped[Optional["Category"]] = relationship(
        back_populates="tickets",
    )
    messages: Mapped[List["Message"]] = relationship(
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
        passive_deletes=True,
    )
    attachments: Mapped[List["Attachment"]] = relationship(
        back_populates="ticket",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    notifications: Mapped[List["Notification"]] = relationship(
        back_populates="ticket",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
