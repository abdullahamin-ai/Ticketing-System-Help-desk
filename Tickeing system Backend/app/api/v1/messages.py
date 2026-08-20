"""Ticket message / reply routes."""
from typing import List

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.api.deps import (
    get_attachment_service,
    get_message_service,
    get_ticket_service,
)
from app.core.deps import get_current_user
from app.core.enums import UserRole
from app.core.exceptions import NotFoundError
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.message import MessageCreate, MessageRead, MessageUpdate
from app.services.attachment import AttachmentService
from app.services.message import MessageService
from app.services.ticket import TicketService

router = APIRouter(prefix="/tickets/{ticket_id}/messages", tags=["messages"])


async def _load_ticket_for_viewer(
    ticket_id: int,
    ticket_service: TicketService,
    viewer: User,
) -> Ticket:
    return await ticket_service.get_ticket(ticket_id, viewer=viewer)


@router.get(
    "",
    response_model=List[MessageRead],
    summary="List messages (internal notes hidden for customers)",
)
async def list_messages(
    ticket_id: int,
    ticket_service: TicketService = Depends(get_ticket_service),
    message_service: MessageService = Depends(get_message_service),
    current_user: User = Depends(get_current_user),
) -> List[MessageRead]:
    ticket = await _load_ticket_for_viewer(ticket_id, ticket_service, current_user)
    include_internal = current_user.role in (UserRole.ADMIN, UserRole.AGENT)
    messages = await message_service.list_for_ticket(
        ticket, viewer_role=current_user.role, include_internal=include_internal
    )
    return [MessageRead.model_validate(m) for m in messages]


@router.post(
    "",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a reply or internal note (with optional attachments)",
)
async def create_message(
    ticket_id: int,
    body: str = Form(..., min_length=1, max_length=10_000),
    is_internal_note: bool = Form(False),
    files: List[UploadFile] = File(default_factory=list),
    ticket_service: TicketService = Depends(get_ticket_service),
    message_service: MessageService = Depends(get_message_service),
    attachment_service: AttachmentService = Depends(get_attachment_service),
    current_user: User = Depends(get_current_user),
) -> MessageRead:
    ticket = await _load_ticket_for_viewer(ticket_id, ticket_service, current_user)
    ticket_service.ensure_can_reply(ticket, current_user)
    payload = MessageCreate(body=body, is_internal_note=is_internal_note)

    msg = await message_service.create(
        ticket=ticket,
        author_id=current_user.id,
        author_role=current_user.role,
        data=payload,
    )

    if files:
        created = await attachment_service.create_for_ticket(
            ticket=ticket, uploader_id=current_user.id, uploads=files
        )
        if created:
            await message_service.attach_files(message=msg, attachments=created)

    await ticket_service.notify_reply(
        ticket=ticket,
        actor_id=current_user.id,
        is_internal_note=is_internal_note,
    )

    msg = await message_service.get_by_id(msg.id)
    return MessageRead.model_validate(msg)


@router.patch(
    "/{message_id}",
    response_model=MessageRead,
    summary="Edit a message (author or admin)",
)
async def update_message(
    ticket_id: int,
    message_id: int,
    payload: MessageUpdate,
    ticket_service: TicketService = Depends(get_ticket_service),
    message_service: MessageService = Depends(get_message_service),
    current_user: User = Depends(get_current_user),
) -> MessageRead:
    await _load_ticket_for_viewer(ticket_id, ticket_service, current_user)
    msg = await message_service.get_by_id(message_id)
    if msg.ticket_id != ticket_id:
        raise NotFoundError("Message not found on this ticket")
    updated = await message_service.update(
        message=msg, actor_id=current_user.id, actor_role=current_user.role, data=payload,
    )
    return MessageRead.model_validate(updated)


@router.delete(
    "/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a message (author or admin)",
)
async def delete_message(
    ticket_id: int,
    message_id: int,
    ticket_service: TicketService = Depends(get_ticket_service),
    message_service: MessageService = Depends(get_message_service),
    current_user: User = Depends(get_current_user),
) -> None:
    await _load_ticket_for_viewer(ticket_id, ticket_service, current_user)
    msg = await message_service.get_by_id(message_id)
    if msg.ticket_id != ticket_id:
        raise NotFoundError("Message not found on this ticket")
    await message_service.delete(
        message=msg, actor_id=current_user.id, actor_role=current_user.role
    )
    return None
