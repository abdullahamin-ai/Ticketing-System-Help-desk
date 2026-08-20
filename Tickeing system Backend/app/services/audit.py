"""Audit log service."""
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import AuditAction
from app.models.audit_log import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(
        self,
        *,
        actor_id: Optional[int],
        action: AuditAction,
        entity_type: str,
        entity_id: Optional[int] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> AuditLog:
        entry = AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            extra_data=extra_data,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry
