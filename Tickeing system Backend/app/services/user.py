"""User service."""
from datetime import datetime, timezone
from typing import Optional, Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import AuditAction, UserRole
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreateAdmin, UserUpdateAdmin
from app.services.audit import AuditService


class UserService:
    def __init__(
        self, db: AsyncSession, audit: AuditService | None = None
    ) -> None:
        self.db = db
        self.audit = audit or AuditService(db)

    async def get_by_id(self, user_id: int) -> User:
        user = await self.db.get(User, user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} not found")
        return user

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email.lower())
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def register_customer(
        self, *, email: str, password: str, full_name: str
    ) -> User:
        """Public registration always creates a CUSTOMER."""
        email_norm = email.lower()
        existing = await self.get_by_email(email_norm)
        if existing is not None:
            raise ConflictError("A user with this email already exists")

        user = User(
            email=email_norm,
            full_name=full_name,
            hashed_password=hash_password(password),
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        await self.audit.log(
            actor_id=user.id,
            action=AuditAction.USER_CREATED,
            entity_type="user",
            entity_id=user.id,
            extra_data={"email": user.email, "role": user.role.value},
        )
        return user

    async def create_user_as_admin(
        self, *, actor: User, data: UserCreateAdmin
    ) -> User:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admins can create users")

        email_norm = data.email.lower()
        existing = await self.get_by_email(email_norm)
        if existing is not None:
            raise ConflictError("A user with this email already exists")

        user = User(
            email=email_norm,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=data.role,
            is_active=data.is_active,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        await self.audit.log(
            actor_id=actor.id,
            action=AuditAction.USER_CREATED,
            entity_type="user",
            entity_id=user.id,
            extra_data={"email": user.email, "role": user.role.value},
        )
        return user

    async def update_user_as_admin(
        self, *, actor: User, user_id: int, data: UserUpdateAdmin
    ) -> User:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admins can update users")

        user = await self.get_by_id(user_id)
        changes: dict = {}
        if data.full_name is not None and data.full_name != user.full_name:
            changes["full_name"] = data.full_name
            user.full_name = data.full_name
        if data.role is not None and data.role != user.role:
            changes["role"] = {"from": user.role.value, "to": data.role.value}
            user.role = data.role
        if data.is_active is not None and data.is_active != user.is_active:
            changes["is_active"] = {"from": user.is_active, "to": data.is_active}
            user.is_active = data.is_active

        if changes:
            await self.db.flush()
            await self.db.refresh(user)
            await self.audit.log(
                actor_id=actor.id,
                action=AuditAction.USER_UPDATED,
                entity_type="user",
                entity_id=user.id,
                extra_data=changes,
            )
        return user

    async def reset_password_as_admin(
        self, *, actor: User, user_id: int, new_password: str
    ) -> User:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admins can reset passwords")
        user = await self.get_by_id(user_id)
        user.hashed_password = hash_password(new_password)
        await self.db.flush()
        await self.db.refresh(user)
        await self.audit.log(
            actor_id=actor.id,
            action=AuditAction.USER_UPDATED,
            entity_type="user",
            entity_id=user.id,
            extra_data={"password_reset": True},
        )
        return user

    async def change_own_password(
        self, *, user: User, current_password: str, new_password: str
    ) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedError("Current password is incorrect")
        user.hashed_password = hash_password(new_password)
        await self.audit.log(
            actor_id=user.id,
            action=AuditAction.USER_UPDATED,
            entity_type="user",
            entity_id=user.id,
            extra_data={"password_changed": True},
        )

    async def list_users(
        self,
        *,
        actor: User,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[User], int]:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admins can list users")

        stmt = select(User)
        if search:
            pat = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(User.email).like(pat),
                    func.lower(User.full_name).like(pat),
                )
            )
        if role is not None:
            stmt = stmt.where(User.role == role)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)

        total_stmt = select(func.count()).select_from(stmt.subquery())
        total = int((await self.db.execute(total_stmt)).scalar_one() or 0)

        stmt = (
            stmt.order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def record_login(self, user: User) -> None:
        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()
