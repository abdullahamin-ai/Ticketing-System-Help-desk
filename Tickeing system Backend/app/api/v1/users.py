"""User routes (current user and admin user management)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.api.deps import get_user_service
from app.core.deps import get_current_user, require_admin
from app.core.enums import UserRole
from app.core.pagination import Page, PageParams
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import (
    UserCreateAdmin,
    UserPasswordUpdate,
    UserRead,
    UserUpdateAdmin,
)
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current authenticated user",
)
async def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


class ChangeOwnPasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


@router.post(
    "/me/password",
    response_model=MessageResponse,
    summary="Change own password",
)
async def change_own_password(
    payload: ChangeOwnPasswordRequest,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> MessageResponse:
    await service.change_own_password(
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return MessageResponse(detail="Password updated")


@router.get(
    "",
    response_model=Page[UserRead],
    summary="[Admin] List users",
)
async def list_users(
    service: UserService = Depends(get_user_service),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    actor: User = Depends(require_admin),
) -> Page[UserRead]:
    items, total = await service.list_users(
        actor=actor,
        search=search,
        role=role,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )
    return Page[UserRead].build(
        [UserRead.model_validate(u) for u in items],
        total,
        PageParams(page=page, page_size=page_size),
    )


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="[Admin] Create a user (agent or customer)",
)
async def create_user(
    payload: UserCreateAdmin,
    service: UserService = Depends(get_user_service),
    actor: User = Depends(require_admin),
) -> UserRead:
    user = await service.create_user_as_admin(actor=actor, data=payload)
    return UserRead.model_validate(user)


@router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="[Admin] Get a user by id",
)
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    _actor: User = Depends(require_admin),
) -> UserRead:
    user = await service.get_by_id(user_id)
    return UserRead.model_validate(user)


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="[Admin] Update a user",
)
async def update_user(
    user_id: int,
    payload: UserUpdateAdmin,
    service: UserService = Depends(get_user_service),
    actor: User = Depends(require_admin),
) -> UserRead:
    user = await service.update_user_as_admin(actor=actor, user_id=user_id, data=payload)
    return UserRead.model_validate(user)


@router.post(
    "/{user_id}/password",
    response_model=MessageResponse,
    summary="[Admin] Reset a user's password",
)
async def reset_user_password(
    user_id: int,
    payload: UserPasswordUpdate,
    service: UserService = Depends(get_user_service),
    actor: User = Depends(require_admin),
) -> MessageResponse:
    await service.reset_password_as_admin(
        actor=actor, user_id=user_id, new_password=payload.new_password
    )
    return MessageResponse(detail="Password reset")
