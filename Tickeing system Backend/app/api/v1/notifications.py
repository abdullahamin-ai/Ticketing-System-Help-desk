"""Notification routes."""
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_notification_service
from app.core.deps import get_current_user
from app.core.pagination import Page, PageParams
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.notification import NotificationMarkRead, NotificationRead
from app.services.notification import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get(
    "",
    response_model=Page[NotificationRead],
    summary="List my notifications",
)
async def list_notifications(
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
) -> Page[NotificationRead]:
    items, total = await service.list_for_user(
        current_user.id, unread_only=unread_only, page=page, page_size=page_size,
    )
    return Page[NotificationRead].build(
        [NotificationRead.model_validate(n) for n in items],
        total,
        PageParams(page=page, page_size=page_size),
    )


@router.get(
    "/unread-count",
    summary="Number of unread notifications for the current user",
)
async def unread_count(
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_user),
) -> dict:
    count = await service.list_unread_count(current_user.id)
    return {"unread": count}


@router.post(
    "/mark-read",
    response_model=MessageResponse,
    summary="Mark notifications as read (specific ids or all)",
)
async def mark_read(
    payload: NotificationMarkRead,
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    updated = await service.mark_read(current_user.id, payload.ids)
    return MessageResponse(detail=f"Marked {updated} notification(s) as read")
