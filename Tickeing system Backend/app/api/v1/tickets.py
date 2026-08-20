"""Ticket routes."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import (
    get_attachment_service,
    get_ticket_service,
)
from app.core.deps import get_current_user
from app.core.enums import TicketPriority, TicketStatus
from app.core.pagination import Page, PageParams
from app.models.user import User
from app.schemas.attachment import AttachmentRead
from app.schemas.ticket import (
    TicketAssign,
    TicketCreate,
    TicketListItem,
    TicketRead,
    TicketStatusUpdate,
    TicketUpdate,
)
from app.services.attachment import AttachmentService
from app.services.ticket import TicketService

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post(
    "",
    response_model=TicketRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a ticket (customer or admin)",
)
async def create_ticket(
    payload: TicketCreate,
    service: TicketService = Depends(get_ticket_service),
    current_user: User = Depends(get_current_user),
) -> TicketRead:
    ticket = await service.create_ticket(customer=current_user, data=payload)
    ticket = await service.get_ticket(ticket.id, viewer=current_user)
    return TicketRead.model_validate(ticket)


@router.get(
    "",
    response_model=Page[TicketListItem],
    summary="List tickets with filters and pagination",
)
async def list_tickets(
    service: TicketService = Depends(get_ticket_service),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[TicketStatus] = Query(None, alias="status"),
    priority: Optional[TicketPriority] = None,
    category_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|priority|status|number)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
) -> Page[TicketListItem]:
    items, total = await service.list_tickets(
        viewer=current_user,
        status=status_filter,
        priority=priority,
        category_id=category_id,
        agent_id=agent_id,
        customer_id=customer_id,
        search=search,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return Page[TicketListItem].build(
        [TicketListItem.model_validate(t) for t in items],
        total,
        PageParams(page=page, page_size=page_size),
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketRead,
    summary="Get a ticket",
)
async def get_ticket(
    ticket_id: int,
    service: TicketService = Depends(get_ticket_service),
    current_user: User = Depends(get_current_user),
) -> TicketRead:
    ticket = await service.get_ticket(ticket_id, viewer=current_user)
    return TicketRead.model_validate(ticket)


@router.patch(
    "/{ticket_id}",
    response_model=TicketRead,
    summary="Update ticket fields",
)
async def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    service: TicketService = Depends(get_ticket_service),
    current_user: User = Depends(get_current_user),
) -> TicketRead:
    ticket = await service.update_ticket(ticket_id, actor=current_user, data=payload)
    ticket = await service.get_ticket(ticket.id, viewer=current_user)
    return TicketRead.model_validate(ticket)


@router.post(
    "/{ticket_id}/assign",
    response_model=TicketRead,
    summary="[Admin] Assign or reassign a ticket",
)
async def assign_ticket(
    ticket_id: int,
    payload: TicketAssign,
    service: TicketService = Depends(get_ticket_service),
    current_user: User = Depends(get_current_user),
) -> TicketRead:
    ticket = await service.assign_ticket(
        ticket_id, actor=current_user, agent_id=payload.agent_id
    )
    ticket = await service.get_ticket(ticket.id, viewer=current_user)
    return TicketRead.model_validate(ticket)


@router.post(
    "/{ticket_id}/status",
    response_model=TicketRead,
    summary="Change ticket status",
)
async def change_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    service: TicketService = Depends(get_ticket_service),
    current_user: User = Depends(get_current_user),
) -> TicketRead:
    ticket = await service.change_status(
        ticket_id, actor=current_user, new_status=payload.status, note=payload.note
    )
    ticket = await service.get_ticket(ticket.id, viewer=current_user)
    return TicketRead.model_validate(ticket)


@router.get(
    "/{ticket_id}/attachments",
    response_model=list[AttachmentRead],
    summary="List ticket attachments",
)
async def list_attachments(
    ticket_id: int,
    ticket_service: TicketService = Depends(get_ticket_service),
    attachment_service: AttachmentService = Depends(get_attachment_service),
    current_user: User = Depends(get_current_user),
) -> list[AttachmentRead]:
    ticket = await ticket_service.get_ticket(ticket_id, viewer=current_user)
    atts = await attachment_service.get_for_ticket(ticket)
    return [AttachmentRead.model_validate(a) for a in atts]


@router.post(
    "/{ticket_id}/close",
    response_model=TicketRead,
    summary="Close ticket (customer only if RESOLVED, otherwise agent/admin)",
)
async def close_ticket(
    ticket_id: int,
    service: TicketService = Depends(get_ticket_service),
    current_user: User = Depends(get_current_user),
) -> TicketRead:
    ticket = await service.change_status(
        ticket_id, actor=current_user, new_status=TicketStatus.CLOSED, note="closed"
    )
    ticket = await service.get_ticket(ticket.id, viewer=current_user)
    return TicketRead.model_validate(ticket)
