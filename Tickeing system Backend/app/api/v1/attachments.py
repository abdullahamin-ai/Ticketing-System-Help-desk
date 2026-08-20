"""Attachment download / delete routes."""
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.api.deps import (
    get_attachment_service,
    get_ticket_service,
)
from app.core.deps import get_current_user
from app.core.enums import UserRole
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.attachment import Attachment
from app.models.user import User
from app.services.attachment import AttachmentService
from app.services.ticket import TicketService

router = APIRouter(prefix="/attachments", tags=["attachments"])


async def _authorize_download(att: Attachment, viewer: User,
                              ticket_service: TicketService) -> None:
    await ticket_service.get_ticket(att.ticket_id, viewer=viewer)


@router.get(
    "/{attachment_id}",
    summary="Download an attachment (RBAC enforced via ticket access)",
)
async def download_attachment(
    attachment_id: int,
    ticket_service: TicketService = Depends(get_ticket_service),
    attachment_service: AttachmentService = Depends(get_attachment_service),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    att = await attachment_service.get_by_id(attachment_id)
    await _authorize_download(att, current_user, ticket_service)
    path = attachment_service.resolve_path(att)
    if not path.exists():
        raise NotFoundError("Attachment file is missing on the server")
    return FileResponse(
        path=str(path),
        media_type=att.content_type,
        filename=att.filename,
    )


@router.delete(
    "/{attachment_id}",
    status_code=204,
    summary="Delete an attachment (uploader or admin)",
)
async def delete_attachment(
    attachment_id: int,
    ticket_service: TicketService = Depends(get_ticket_service),
    attachment_service: AttachmentService = Depends(get_attachment_service),
    current_user: User = Depends(get_current_user),
) -> None:
    att = await attachment_service.get_by_id(attachment_id)
    await _authorize_download(att, current_user, ticket_service)
    if current_user.role != UserRole.ADMIN and att.uploader_id != current_user.id:
        raise ForbiddenError("You can only delete your own attachments")
    await attachment_service.delete(att)
    return None
