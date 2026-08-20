"""FastAPI application entrypoint."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.enums import UserRole
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.security import hash_password
from app.models.user import User

logger = get_logger(__name__)


async def _ensure_initial_admin() -> None:
    """Create the initial admin from env on first boot, if provided."""
    email = settings.INITIAL_ADMIN_EMAIL
    password = settings.INITIAL_ADMIN_PASSWORD
    if not email or not password:
        return

    async with AsyncSessionLocal() as session:
        try:
            existing_admin = await session.execute(
                select(User).where(User.role == UserRole.ADMIN).limit(1)
            )
            if existing_admin.scalar_one_or_none() is not None:
                return

            existing_user = await session.execute(
                select(User).where(User.email == email.lower())
            )
            user = existing_user.scalar_one_or_none()
            if user is None:
                user = User(
                    email=email.lower(),
                    full_name=settings.INITIAL_ADMIN_FULL_NAME,
                    hashed_password=hash_password(password),
                    role=UserRole.ADMIN,
                    is_active=True,
                )
                session.add(user)
            else:
                user.role = UserRole.ADMIN
                user.is_active = True
                user.hashed_password = hash_password(password)
            await session.commit()
            logger.info("Initial admin ensured: %s", email.lower())
        except Exception:
            logger.exception("Failed to ensure initial admin")
            await session.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    await _ensure_initial_admin()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/health", tags=["infra"], summary="Liveness probe")
    async def health() -> dict:
        return {"status": "ok"}

    @app.get("/", tags=["infra"], include_in_schema=False)
    async def root() -> dict:
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs",
        }

    return app


app = create_app()
