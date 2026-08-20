"""User SQLAlchemy model."""
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import UserRole
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.message import Message
    from app.models.attachment import Attachment
    from app.models.notification import Notification
    from app.models.audit_log import AuditLog


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", length=20),
        nullable=False,
        default=UserRole.CUSTOMER,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, index=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    tickets_created: Mapped[List["Ticket"]] = relationship(
        back_populates="customer",
        foreign_keys="Ticket.customer_id",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    tickets_assigned: Mapped[List["Ticket"]] = relationship(
        back_populates="agent",
        foreign_keys="Ticket.agent_id",
        passive_deletes=True,
    )
    messages: Mapped[List["Message"]] = relationship(
        back_populates="author",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    attachments: Mapped[List["Attachment"]] = relationship(
        back_populates="uploader",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    notifications: Mapped[List["Notification"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        back_populates="actor",
        foreign_keys="AuditLog.actor_id",
        passive_deletes=True,
    )
