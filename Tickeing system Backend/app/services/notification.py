"""Notification service."""
from datetime import datetime, timezone
from typing import Iterable, Optional, Sequence

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NotificationType
from app.models.notification import Notification


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        *,
        user_id: int,
        type: NotificationType,
        title: str,
        body: str,
        ticket_id: Optional[int] = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            ticket_id=ticket_id,
        )
        self.db.add(notif)
        await self.db.flush()
        return notif

    async def create_many(
        self, payloads: Iterable[dict]
    ) -> list[Notification]:
        objs = [Notification(**p) for p in payloads]
        self.db.add_all(objs)
        await self.db.flush()
        return objs

    async def mark_read(
        self, user_id: int, ids: Optional[list[int]] = None
    ) -> int:
        """Mark specific notifications (or all unread) for a user as read."""
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.is_read.is_(False))
        )
        if ids is not None:
            stmt = stmt.where(Notification.id.in_(ids))
        result = await self.db.execute(
            stmt.values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        return result.rowcount or 0

    async def list_unread_count(self, user_id: int) -> int:
        stmt = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        result = await self.db.execute(stmt)
        return int(result.scalar_one() or 0)

    async def invalidate_assignment_notifications(
        self, *, user_id: int, ticket_id: int
    ) -> int:
        """Remove a user's stale 'ticket assigned to you' notifications for a
        ticket they are no longer assigned to (e.g. after reassignment or
        unassignment). Prevents dead links in the notifications tab."""
        stmt = delete(Notification).where(
            Notification.user_id == user_id,
            Notification.ticket_id == ticket_id,
            Notification.type == NotificationType.TICKET_ASSIGNED,
        )
        result = await self.db.execute(stmt)
        return result.rowcount or 0

    async def list_for_user(
        self,
        user_id: int,
        *,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Notification], int]:
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))

        total_stmt = select(func.count()).select_from(stmt.subquery())
        total = int((await self.db.execute(total_stmt)).scalar_one() or 0)

        stmt = (
            stmt.order_by(Notification.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total