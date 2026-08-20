"""User-related schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import UserRole
from app.schemas.common import ORMBase


class UserCreateAdmin(BaseModel):
    """Payload an ADMIN uses to create another user (agent or customer)."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    role: UserRole = UserRole.CUSTOMER
    is_active: bool = True


class UserUpdateAdmin(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserPasswordUpdate(BaseModel):
    """Used by ADMIN to reset a user's password (or by self)."""
    new_password: str = Field(min_length=8, max_length=128)


class UserRead(ORMBase):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None


class UserMinimal(ORMBase):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
