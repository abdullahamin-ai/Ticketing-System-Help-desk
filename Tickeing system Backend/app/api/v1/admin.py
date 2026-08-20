"""Admin routes (audit logs)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.core.deps import require_admin
from app.core.enums import AuditAction
from app.core.pagination import Page, PageParams
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogRead

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/audit-logs",
    response_model=Page[AuditLogRead],
    summary="[Admin] List audit log entries",
)
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[AuditAction] = None,
    actor_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    _actor: User = Depends(require_admin),
) -> Page[AuditLogRead]:
    stmt = select(AuditLog).options(selectinload(AuditLog.actor))
    if action is not None:
        stmt = stmt.where(AuditLog.action == action)
    if actor_id is not None:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    if entity_type is not None:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        stmt = stmt.where(AuditLog.entity_id == entity_id)

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(total_stmt)).scalar_one() or 0)
    stmt = (
        stmt.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())
    return Page[AuditLogRead].build(
        [AuditLogRead.model_validate(a) for a in items],
        total,
        PageParams(page=page, page_size=page_size),
    )