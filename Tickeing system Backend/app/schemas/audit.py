"""Audit log schemas."""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from app.core.enums import AuditAction
from app.schemas.common import ORMBase
from app.schemas.user import UserMinimal


class AuditLogRead(ORMBase):
    id: int
    actor: Optional[UserMinimal] = None
    action: AuditAction
    entity_type: str
    entity_id: Optional[int] = None
    extra_data: Optional[dict[str, Any]] = None
    created_at: datetime
