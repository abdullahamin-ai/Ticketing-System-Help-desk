"""Auth service - login, token issuance."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.services.user import UserService


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserService(db)

    async def authenticate(self, *, email: str, password: str) -> TokenResponse:
        email_norm = email.lower()
        stmt = select(User).where(User.email == email_norm)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("User account is inactive")

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role.value},
        )
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def register_customer(
        self, *, email: str, password: str, full_name: str
    ) -> User:
        return await self.users.register_customer(
            email=email, password=password, full_name=full_name
        )
