"""Ticket message service."""
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import UserRole
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.attachment import Attachment
from app.models.message import Message
from app.models.ticket import Ticket
from app.schemas.message import MessageCreate, MessageUpdate


class MessageService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_ticket(
        self, ticket: Ticket, *, viewer_role: UserRole, include_internal: bool
    ) -> Sequence[Message]:
        stmt = (
            select(Message)
            .options(selectinload(Message.author), selectinload(Message.attachments))
            .where(Message.ticket_id == ticket.id)
            .order_by(Message.created_at.asc())
        )
        if not include_internal:
            stmt = stmt.where(Message.is_internal_note.is_(False))
        result = await self.db.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_by_id(self, message_id: int) -> Message:
        stmt = (
            select(Message)
            .options(selectinload(Message.author), selectinload(Message.attachments))
            .where(Message.id == message_id)
        )
        result = await self.db.execute(stmt)
        msg = result.scalar_one_or_none()
        if msg is None:
            raise NotFoundError("Message not found")
        return msg

    async def create(
        self,
        *,
        ticket: Ticket,
        author_id: int,
        author_role: UserRole,
        data: MessageCreate,
    ) -> Message:
        if data.is_internal_note and author_role == UserRole.CUSTOMER:
            raise ForbiddenError("Customers cannot create internal notes")

        msg = Message(
            ticket_id=ticket.id,
            author_id=author_id,
            body=data.body,
            is_internal_note=data.is_internal_note,
        )
        self.db.add(msg)
        await self.db.flush()
        return msg

    async def update(
        self, *, message: Message, actor_id: int, actor_role: UserRole, data: MessageUpdate
    ) -> Message:
        if actor_role != UserRole.ADMIN and message.author_id != actor_id:
            raise ForbiddenError("You can only edit your own messages")
        message.body = data.body
        await self.db.flush()
        return message

    async def delete(self, *, message: Message, actor_id: int, actor_role: UserRole) -> None:
        if actor_role != UserRole.ADMIN and message.author_id != actor_id:
            raise ForbiddenError("You can only delete your own messages")
        await self.db.delete(message)
        await self.db.flush()

    async def attach_files(
        self, *, message: Message, attachments: Sequence[Attachment]
    ) -> None:
        for att in attachments:
            att.message_id = message.id
        await self.db.flush()
