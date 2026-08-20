"""Shared FastAPI dependencies (auth/RBAC)."""
from typing import Iterable

import jwt
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/token",
    auto_error=False,
)


async def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the current authenticated user, validating the JWT."""
    if not token:
        raise UnauthorizedError("Not authenticated")

    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Invalid token") from exc

    user_id_raw = payload.get("sub")
    if not user_id_raw:
        raise UnauthorizedError("Invalid token payload")

    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError("Invalid token subject") from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedError("User no longer exists")
    if not user.is_active:
        raise UnauthorizedError("User account is inactive")

    request.state.jwt_payload = payload
    return user


def require_roles(*allowed: UserRole):
    """Dependency factory: returns a dependency that enforces membership in allowed."""
    allowed_set: set[UserRole] = set(allowed)

    async def _checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_set:
            raise ForbiddenError(
                f"Required role(s): {', '.join(r.value for r in allowed_set)}"
            )
        return current_user

    return _checker


# Convenience aliases
require_admin = require_roles(UserRole.ADMIN)
require_agent_or_admin = require_roles(UserRole.ADMIN, UserRole.AGENT)
require_authenticated = require_roles(
    UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER
)


def user_has_any_role(user: User, roles: Iterable[UserRole]) -> bool:
    return user.role in set(roles)
