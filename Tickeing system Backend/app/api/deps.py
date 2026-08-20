"""Common API dependencies: service factories, current user shortcuts."""
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.analytics import AnalyticsService
from app.services.attachment import AttachmentService
from app.services.audit import AuditService
from app.services.auth import AuthService
from app.services.category import CategoryService
from app.services.message import MessageService
from app.services.notification import NotificationService
from app.services.ticket import TicketService
from app.services.user import UserService


DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def get_audit_service(db: DBSession) -> AuditService:
    return AuditService(db)


def get_notification_service(db: DBSession) -> NotificationService:
    return NotificationService(db)


def get_user_service(db: DBSession) -> UserService:
    return UserService(db)


def get_auth_service(db: DBSession) -> AuthService:
    return AuthService(db)


def get_category_service(db: DBSession) -> CategoryService:
    return CategoryService(db)


def get_ticket_service(db: DBSession) -> TicketService:
    return TicketService(db)


def get_message_service(db: DBSession) -> MessageService:
    return MessageService(db)


def get_attachment_service(db: DBSession) -> AttachmentService:
    return AttachmentService(db)


def get_analytics_service(db: DBSession) -> AnalyticsService:
    return AnalyticsService(db)
