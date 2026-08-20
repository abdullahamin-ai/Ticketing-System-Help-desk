"""Analytics service."""
from typing import Optional

from sqlalchemy import func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import TicketStatus
from app.models.category import Category
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.analytics import (
    CountByAgent,
    CountByCategory,
    CountByPriority,
    TicketAnalytics,
)


class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def summary(self) -> TicketAnalytics:
        total = await self._scalar_count(select(func.count(Ticket.id)))
        open_n = await self._scalar_count(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.OPEN)
        )
        ip_n = await self._scalar_count(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.IN_PROGRESS)
        )
        wc_n = await self._scalar_count(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.WAITING_FOR_CUSTOMER)
        )
        resolved_n = await self._scalar_count(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.RESOLVED)
        )
        closed_n = await self._scalar_count(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.CLOSED)
        )

        by_priority = await self._by_priority()
        by_category = await self._by_category()
        by_agent = await self._by_agent()
        avg_hours = await self._avg_resolution_hours()

        return TicketAnalytics(
            total_tickets=total,
            open=open_n,
            in_progress=ip_n,
            waiting_for_customer=wc_n,
            resolved=resolved_n,
            closed=closed_n,
            average_resolution_hours=avg_hours,
            by_priority=by_priority,
            by_category=by_category,
            by_agent=by_agent,
        )

    async def _scalar_count(self, stmt) -> int:
        result = await self.db.execute(stmt)
        return int(result.scalar_one() or 0)

    async def _by_priority(self) -> list[CountByPriority]:
        stmt = select(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority)
        result = await self.db.execute(stmt)
        return [CountByPriority(priority=p, count=c) for p, c in result.all()]

    async def _by_category(self) -> list[CountByCategory]:
        stmt = (
            select(Category.id, Category.name, func.count(Ticket.id))
            .select_from(Ticket)
            .outerjoin(Category, Ticket.category_id == Category.id)
            .group_by(Category.id, Category.name)
            .order_by(func.count(Ticket.id).desc())
        )
        result = await self.db.execute(stmt)
        out: list[CountByCategory] = []
        for cid, cname, count in result.all():
            out.append(CountByCategory(category_id=cid, category_name=cname, count=count))
        return out

    async def _by_agent(self) -> list[CountByAgent]:
        stmt = (
            select(User.id, User.full_name, func.count(Ticket.id))
            .select_from(Ticket)
            .outerjoin(User, Ticket.agent_id == User.id)
            .group_by(User.id, User.full_name)
            .order_by(func.count(Ticket.id).desc())
        )
        result = await self.db.execute(stmt)
        out: list[CountByAgent] = []
        for uid, uname, count in result.all():
            out.append(CountByAgent(agent_id=uid, agent_name=uname, count=count))
        return out

    async def _avg_resolution_hours(self) -> Optional[float]:
        # MySQL: TIMESTAMPDIFF(SECOND, a, b) / 3600.0
        diff_seconds = func.timestampdiff(
            literal_column("SECOND"),
            Ticket.created_at,
            Ticket.resolved_at,
        )
        stmt = select(func.avg(diff_seconds)).where(Ticket.resolved_at.is_not(None))
        result = await self.db.execute(stmt)
        avg_seconds = result.scalar_one()
        if avg_seconds is None:
            return None
        return round(float(avg_seconds) / 3600.0, 2)