"""Ticket service - core business logic for tickets."""
from datetime import datetime, timezone
from typing import Optional, Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import (
    ALLOWED_TICKET_TRANSITIONS,
    AuditAction,
    NotificationType,
    TicketPriority,
    TicketStatus,
    UserRole,
)
from app.core.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
)
from app.models.category import Category
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.services.audit import AuditService
from app.services.notification import NotificationService


class _TicketNumberGenerator:
    """Computes the next ticket number in TKT-000001 format."""

    @staticmethod
    async def next_number(db: AsyncSession) -> str:
        result = await db.execute(
            select(func.coalesce(func.max(Ticket.id), 0))
        )
        max_id = int(result.scalar_one() or 0)
        return f"TKT-{max_id + 1:06d}"


class TicketService:
    def __init__(
        self,
        db: AsyncSession,
        audit: AuditService | None = None,
        notifications: NotificationService | None = None,
    ) -> None:
        self.db = db
        self.audit = audit or AuditService(db)
        self.notifications = notifications or NotificationService(db)

    async def _load_ticket(self, ticket_id: int) -> Ticket:
        stmt = (
            select(Ticket)
            .options(
                selectinload(Ticket.customer),
                selectinload(Ticket.agent),
                selectinload(Ticket.category),
            )
            .where(Ticket.id == ticket_id)
        )
        result = await self.db.execute(stmt)
        ticket = result.scalar_one_or_none()
        if ticket is None:
            raise NotFoundError(f"Ticket {ticket_id} not found")
        return ticket

    def ensure_can_view(self, ticket: Ticket, user: User) -> None:
        if user.role == UserRole.ADMIN:
            return
        if user.role == UserRole.AGENT:
            if ticket.agent_id == user.id:
                return
            raise ForbiddenError("You can only access tickets assigned to you")
        if ticket.customer_id != user.id:
            raise ForbiddenError("You can only access your own tickets")

    def ensure_can_reply(self, ticket: Ticket, user: User) -> None:
        if user.role == UserRole.ADMIN:
            return
        if user.role == UserRole.AGENT:
            if ticket.agent_id == user.id:
                return
            raise ForbiddenError("You can only reply to tickets assigned to you")
        if user.role == UserRole.CUSTOMER:
            if ticket.customer_id != user.id:
                raise ForbiddenError("You can only reply to your own tickets")
            if ticket.status == TicketStatus.CLOSED:
                raise ForbiddenError("Cannot reply to a closed ticket")
            return

    def ensure_can_modify(self, ticket: Ticket, user: User) -> None:
        if user.role == UserRole.ADMIN:
            return
        if user.role == UserRole.AGENT and ticket.agent_id == user.id:
            return
        if user.role == UserRole.CUSTOMER:
            if ticket.customer_id != user.id:
                raise ForbiddenError("Not your ticket")
            if ticket.status != TicketStatus.OPEN:
                raise ForbiddenError(
                    "Ticket can no longer be edited; please reply instead"
                )
            return
        raise ForbiddenError("Not allowed to modify this ticket")

    def ensure_can_close_as_customer(self, ticket: Ticket, user: User) -> None:
        if user.role == UserRole.ADMIN:
            return
        if user.role == UserRole.AGENT and ticket.agent_id == user.id:
            return
        if user.role == UserRole.CUSTOMER and ticket.customer_id == user.id:
            if ticket.status != TicketStatus.RESOLVED:
                raise ForbiddenError(
                    "Ticket can be closed only after it is resolved"
                )
            return
        raise ForbiddenError("Not allowed to close this ticket")

    async def create_ticket(
        self, *, customer: User, data: TicketCreate
    ) -> Ticket:
        if customer.role not in (UserRole.CUSTOMER, UserRole.ADMIN):
            raise ForbiddenError("Only customers can create tickets")

        category = None
        if data.category_id is not None:
            category = await self.db.get(Category, data.category_id)
            if category is None:
                raise NotFoundError("Category not found")
            if not category.is_active:
                raise BadRequestError("Category is inactive")

        number = await _TicketNumberGenerator.next_number(self.db)
        ticket = Ticket(
            number=number,
            subject=data.subject,
            description=data.description,
            priority=data.priority,
            status=TicketStatus.OPEN,
            customer_id=customer.id,
            agent_id=None,
            category_id=category.id if category else None,
        )
        self.db.add(ticket)
        await self.db.flush()

        await self.audit.log(
            actor_id=customer.id,
            action=AuditAction.TICKET_CREATED,
            entity_type="ticket",
            entity_id=ticket.id,
            extra_data={"number": ticket.number, "priority": ticket.priority.value},
        )

        await self._notify_admins_new_ticket(ticket)
        return ticket

    async def get_ticket(self, ticket_id: int, *, viewer: User) -> Ticket:
        ticket = await self._load_ticket(ticket_id)
        self.ensure_can_view(ticket, viewer)
        return ticket

    async def update_ticket(
        self, ticket_id: int, *, actor: User, data: TicketUpdate
    ) -> Ticket:
        ticket = await self._load_ticket(ticket_id)
        self.ensure_can_modify(ticket, actor)

        changes: dict = {}
        if data.subject is not None and data.subject != ticket.subject:
            changes["subject"] = {"from": ticket.subject, "to": data.subject}
            ticket.subject = data.subject
        if data.description is not None and data.description != ticket.description:
            changes["description"] = "updated"
            ticket.description = data.description
        if data.priority is not None and data.priority != ticket.priority:
            changes["priority"] = {"from": ticket.priority.value, "to": data.priority.value}
            ticket.priority = data.priority
        if data.category_id is not None and data.category_id != ticket.category_id:
            cat = await self.db.get(Category, data.category_id)
            if cat is None:
                raise NotFoundError("Category not found")
            if not cat.is_active:
                raise BadRequestError("Category is inactive")
            changes["category_id"] = {"from": ticket.category_id, "to": cat.id}
            ticket.category_id = cat.id

        if changes:
            await self.audit.log(
                actor_id=actor.id,
                action=AuditAction.TICKET_UPDATED,
                entity_type="ticket",
                entity_id=ticket.id,
                extra_data=changes,
            )
        return ticket

    async def assign_ticket(
        self, ticket_id: int, *, actor: User, agent_id: Optional[int]
    ) -> Ticket:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admins can assign tickets")
        ticket = await self._load_ticket(ticket_id)

        agent: Optional[User] = None
        if agent_id is not None:
            agent = await self.db.get(User, agent_id)
            if agent is None:
                raise NotFoundError("Agent not found")
            if agent.role not in (UserRole.AGENT, UserRole.ADMIN):
                raise BadRequestError("Target user is not an agent/admin")
            if not agent.is_active:
                raise BadRequestError("Target agent is inactive")

        old_agent_id = ticket.agent_id
        ticket.agent_id = agent.id if agent else None
        ticket.agent = agent

        await self.audit.log(
            actor_id=actor.id,
            action=AuditAction.TICKET_ASSIGNED,
            entity_type="ticket",
            entity_id=ticket.id,
            extra_data={"from": old_agent_id, "to": ticket.agent_id},
        )

        # The previous agent (if any, and if different from the new one) no
        # longer has access to this ticket — clear their stale "assigned to
        # you" notification so it doesn't sit in their notifications tab
        # pointing at a ticket they can no longer open.
        if old_agent_id is not None and old_agent_id != ticket.agent_id:
            await self.notifications.invalidate_assignment_notifications(
                user_id=old_agent_id, ticket_id=ticket.id
            )

        if agent is not None:
            await self.notifications.create(
                user_id=agent.id,
                type=NotificationType.TICKET_ASSIGNED,
                title=f"Ticket {ticket.number} assigned to you",
                body=f"You have been assigned ticket '{ticket.subject}'.",
                ticket_id=ticket.id,
            )
        return ticket

    async def change_status(
        self,
        ticket_id: int,
        *,
        actor: User,
        new_status: TicketStatus,
        note: Optional[str] = None,
    ) -> Ticket:
        ticket = await self._load_ticket(ticket_id)
        if new_status == ticket.status:
            return ticket

        allowed = ALLOWED_TICKET_TRANSITIONS.get(ticket.status, set())
        if new_status not in allowed:
            if not (
                actor.role == UserRole.ADMIN
                and ticket.status == TicketStatus.CLOSED
                and new_status in {TicketStatus.IN_PROGRESS, TicketStatus.OPEN}
            ):
                raise BadRequestError(
                    f"Illegal status transition: {ticket.status.value} -> {new_status.value}"
                )

        if new_status == TicketStatus.CLOSED:
            self.ensure_can_close_as_customer(ticket, actor)
        else:
            if actor.role == UserRole.CUSTOMER:
                raise ForbiddenError("Customers cannot change ticket status")
            if actor.role == UserRole.AGENT and ticket.agent_id != actor.id:
                raise ForbiddenError("Ticket not assigned to you")

        old_status = ticket.status
        ticket.status = new_status
        now = datetime.now(timezone.utc)
        if new_status == TicketStatus.RESOLVED:
            ticket.resolved_at = now
        if new_status == TicketStatus.CLOSED:
            ticket.closed_at = now
        if (
            new_status in {TicketStatus.OPEN, TicketStatus.IN_PROGRESS}
            and old_status in {TicketStatus.RESOLVED, TicketStatus.CLOSED}
        ):
            ticket.resolved_at = None
            ticket.closed_at = None

        await self.audit.log(
            actor_id=actor.id,
            action=AuditAction.TICKET_STATUS_CHANGED,
            entity_type="ticket",
            entity_id=ticket.id,
            extra_data={"from": old_status.value, "to": new_status.value, "note": note},
        )

        notif_type = (
            NotificationType.TICKET_RESOLVED
            if new_status == TicketStatus.RESOLVED
            else NotificationType.TICKET_CLOSED
            if new_status == TicketStatus.CLOSED
            else NotificationType.TICKET_STATUS_CHANGED
        )
        title_map = {
            TicketStatus.RESOLVED: f"Ticket {ticket.number} resolved",
            TicketStatus.CLOSED: f"Ticket {ticket.number} closed",
        }
        body_map = {
            TicketStatus.RESOLVED: f"Your ticket '{ticket.subject}' was marked as resolved.",
            TicketStatus.CLOSED: f"Your ticket '{ticket.subject}' was closed.",
        }

        recipients = set()
        if actor.id != ticket.customer_id:
            recipients.add(ticket.customer_id)
        if ticket.agent_id and actor.id != ticket.agent_id:
            recipients.add(ticket.agent_id)
        for aid in await self._list_admin_ids():
            if aid != actor.id:
                recipients.add(aid)

        for uid in recipients:
            await self.notifications.create(
                user_id=uid,
                type=notif_type,
                title=title_map.get(new_status, f"Ticket {ticket.number} status updated"),
                body=body_map.get(new_status, f"Status changed to {new_status.value}."),
                ticket_id=ticket.id,
            )
        return ticket

    async def list_tickets(
        self,
        *,
        viewer: User,
        status: Optional[TicketStatus] = None,
        priority: Optional[TicketPriority] = None,
        category_id: Optional[int] = None,
        agent_id: Optional[int] = None,
        customer_id: Optional[int] = None,
        search: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> tuple[Sequence[Ticket], int]:
        stmt = select(Ticket).options(
            selectinload(Ticket.customer),
            selectinload(Ticket.agent),
        )

        if viewer.role == UserRole.CUSTOMER:
            stmt = stmt.where(Ticket.customer_id == viewer.id)
        elif viewer.role == UserRole.AGENT:
            stmt = stmt.where(Ticket.agent_id == viewer.id)

        if status is not None:
            stmt = stmt.where(Ticket.status == status)
        if priority is not None:
            stmt = stmt.where(Ticket.priority == priority)
        if category_id is not None:
            stmt = stmt.where(Ticket.category_id == category_id)
        if agent_id is not None:
            stmt = stmt.where(Ticket.agent_id == agent_id)
        if customer_id is not None:
            stmt = stmt.where(Ticket.customer_id == customer_id)
        if search:
            pat = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Ticket.subject).like(pat),
                    func.lower(Ticket.number).like(pat),
                    func.lower(Ticket.description).like(pat),
                )
            )
        if date_from is not None:
            stmt = stmt.where(Ticket.created_at >= date_from)
        if date_to is not None:
            stmt = stmt.where(Ticket.created_at <= date_to)

        sort_map = {
            "created_at": Ticket.created_at,
            "updated_at": Ticket.updated_at,
            "priority": Ticket.priority,
            "status": Ticket.status,
            "number": Ticket.number,
        }
        sort_col = sort_map.get(sort_by, Ticket.created_at)
        stmt = stmt.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

        total_stmt = select(func.count()).select_from(stmt.subquery())
        total = int((await self.db.execute(total_stmt)).scalar_one() or 0)

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        return list(result.scalars().unique().all()), total

    async def _list_admin_ids(self) -> list[int]:
        stmt = select(User.id).where(
            User.role == UserRole.ADMIN, User.is_active.is_(True)
        )
        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]

    async def _notify_admins_new_ticket(self, ticket: Ticket) -> None:
        admin_ids = await self._list_admin_ids()
        for uid in admin_ids:
            await self.notifications.create(
                user_id=uid,
                type=NotificationType.TICKET_CREATED,
                title=f"New ticket {ticket.number}",
                body=f"New ticket opened: '{ticket.subject}'.",
                ticket_id=ticket.id,
            )

    async def notify_reply(
        self, *, ticket: Ticket, actor_id: int, is_internal_note: bool
    ) -> None:
        if is_internal_note:
            recipients: set[int] = set()
            if ticket.agent_id and ticket.agent_id != actor_id:
                recipients.add(ticket.agent_id)
            for aid in await self._list_admin_ids():
                if aid != actor_id:
                    recipients.add(aid)
            for uid in recipients:
                await self.notifications.create(
                    user_id=uid,
                    type=NotificationType.TICKET_REPLIED,
                    title=f"Internal note on {ticket.number}",
                    body=f"New internal note on ticket '{ticket.subject}'.",
                    ticket_id=ticket.id,
                )
            return

        recipients = set()
        if actor_id == ticket.customer_id and ticket.agent_id:
            recipients.add(ticket.agent_id)
        elif actor_id == ticket.agent_id and ticket.customer_id:
            recipients.add(ticket.customer_id)
        elif actor_id == ticket.customer_id and not ticket.agent_id:
            for aid in await self._list_admin_ids():
                recipients.add(aid)
        for aid in await self._list_admin_ids():
            if aid != actor_id:
                recipients.add(aid)
        for uid in recipients:
            await self.notifications.create(
                user_id=uid,
                type=NotificationType.TICKET_REPLIED,
                title=f"New reply on {ticket.number}",
                body=f"New reply on ticket '{ticket.subject}'.",
                ticket_id=ticket.id,
            )