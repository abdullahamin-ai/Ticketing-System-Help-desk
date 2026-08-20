"""Authentication routes."""
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_auth_service
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Public customer registration",
)
async def register(
    payload: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> UserRead:
    """Always creates a CUSTOMER. Admin creation is done via the admin API."""
    user = await service.register_customer(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    return UserRead.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password",
)
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await service.authenticate(email=payload.email, password=payload.password)


@router.post(
    "/token",
    response_model=TokenResponse,
    include_in_schema=False,
    summary="OAuth2-compatible login used by Swagger's Authorize button",
)
async def login_for_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await service.authenticate(
        email=form_data.username, password=form_data.password
    )