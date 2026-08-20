"""Pytest fixtures for MySQL-based integration/API tests."""

from __future__ import annotations

import os
from typing import AsyncGenerator

# ---------------------------------------------------------------------------
# Test environment
# ---------------------------------------------------------------------------

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DEBUG", "1")

os.environ.setdefault(
    "SECRET_KEY",
    "test-secret-key-for-pytest-only-do-not-use-in-prod",
)

# IMPORTANT:
# The MySQL database itself must already exist.
#
# Database:
# ticketing_system_test
#
os.environ.setdefault(
    "DATABASE_URL",
    "mysql+aiomysql://root:amin12345@localhost:3306/ticketing_system_test",
)

os.environ.setdefault(
    "INITIAL_ADMIN_EMAIL",
    "admin@example.com",
)

os.environ.setdefault(
    "INITIAL_ADMIN_PASSWORD",
    "AdminPass123!",
)


# ---------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------

import pytest
import pytest_asyncio

from httpx import ASGITransport, AsyncClient

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.core.database import Base, get_db
import app.models  # noqa: F401

from app.main import create_app


# Clear cached settings after setting test environment variables.
get_settings.cache_clear()


# ---------------------------------------------------------------------------
# Test database engine
# ---------------------------------------------------------------------------

# IMPORTANT:
# NullPool prevents async MySQL connections from being reused across
# different pytest event loops.
#
# This is especially important on Windows with:
# Python 3.13 + asyncio + aiomysql + SQLAlchemy.
#
test_engine = create_async_engine(
    os.environ["DATABASE_URL"],
    poolclass=NullPool,
    echo=False,
)


TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

async def _clean_database() -> None:
    """
    Remove test data so every test starts from a clean database.

    Tables are preserved; only rows are deleted.

    Foreign-key checks are temporarily disabled because the project contains
    multiple related tables.
    """

    async with test_engine.begin() as conn:
        await conn.exec_driver_sql("SET FOREIGN_KEY_CHECKS = 0")

        # Delete rows from all application tables.
        #
        # Using metadata.sorted_tables in reverse order handles dependent
        # tables before parent tables.
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(delete(table))

        await conn.exec_driver_sql("SET FOREIGN_KEY_CHECKS = 1")


async def _create_initial_admin() -> None:
    """
    Create the initial admin user required by admin-related tests.

    This uses the application's User model and password hashing logic.
    """

    from app.models.user import User
    from app.core.security import hash_password

    admin_email = os.environ["INITIAL_ADMIN_EMAIL"]
    admin_password = os.environ["INITIAL_ADMIN_PASSWORD"]

    async with TestSessionLocal() as session:
        admin = User(
            email=admin_email,
            hashed_password=hash_password(admin_password),
            full_name="Initial Admin",
            role="ADMIN",
            is_active=True,
        )

        session.add(admin)
        await session.commit()


async def _reset_test_database() -> None:
    """
    Reset database and recreate required seed data.
    """

    await _clean_database()
    await _create_initial_admin()


# ---------------------------------------------------------------------------
# Database lifecycle
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session", autouse=True)
async def _create_tables() -> AsyncGenerator[None, None]:
    """
    Create all application tables before the test session.

    The MySQL database itself must already exist.
    """

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # Dispose connections before pytest closes the event loop.
    await test_engine.dispose()


# ---------------------------------------------------------------------------
# Per-test database reset
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(autouse=True)
async def _reset_database(
    _create_tables,
) -> AsyncGenerator[None, None]:
    """
    Give every test a clean database.

    This prevents one test from affecting another test.
    """

    await _reset_test_database()

    yield


# ---------------------------------------------------------------------------
# Database session
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db_session(
    _create_tables,
) -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session for direct database tests."""

    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            if session.in_transaction():
                await session.rollback()

            await session.close()


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def app(
    _create_tables,
) :
    """
    Create FastAPI application using the test database.
    """

    application = create_app()

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        """
        Provide a fresh database session for every API request.
        """

        async with TestSessionLocal() as session:
            try:
                yield session

                # Commit successful API requests.
                await session.commit()

            except Exception:
                # Roll back only if a transaction is active.
                if session.in_transaction():
                    await session.rollback()

                raise

            finally:
                await session.close()

    application.dependency_overrides[get_db] = _override_get_db

    return application


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def client(
    app,
) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP client for API tests."""

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# Authentication helper
# ---------------------------------------------------------------------------

async def _register_and_login(
    client: AsyncClient,
    email: str,
    password: str,
    full_name: str = "Test User",
) -> dict:
    """
    Register a test user and return its authorization header.
    """

    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
        },
    )

    assert response.status_code == 201, response.text

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 200, response.text

    return {
        "Authorization": f"Bearer {response.json()['access_token']}"
    }


# ---------------------------------------------------------------------------
# Customer authentication
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def customer_auth(
    client: AsyncClient,
) -> dict:
    """Authenticated customer user."""

    return await _register_and_login(
        client,
        "alice.customer@example.com",
        "CustomerPass1!",
        "Alice Customer",
    )


# ---------------------------------------------------------------------------
# Second customer authentication
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def other_customer_auth(
    client: AsyncClient,
) -> dict:
    """Second authenticated customer user."""

    return await _register_and_login(
        client,
        "bob.customer@example.com",
        "OtherPass123!",
        "Bob Customer",
    )


# ---------------------------------------------------------------------------
# Admin authentication
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def admin_auth(
    client: AsyncClient,
) -> dict:
    """Authenticated admin user."""

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": os.environ["INITIAL_ADMIN_EMAIL"],
            "password": os.environ["INITIAL_ADMIN_PASSWORD"],
        },
    )

    assert response.status_code == 200, response.text

    return {
        "Authorization": f"Bearer {response.json()['access_token']}"
    }


# ---------------------------------------------------------------------------
# Agent user
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def agent_user(
    client: AsyncClient,
    admin_auth: dict,
) -> dict:
    """Create and authenticate an agent user."""

    response = await client.post(
        "/api/v1/users",
        json={
            "email": "anna.agent@example.com",
            "password": "AgentPass123!",
            "full_name": "Anna Agent",
            "role": "AGENT",
        },
        headers=admin_auth,
    )

    assert response.status_code == 201, response.text

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "anna.agent@example.com",
            "password": "AgentPass123!",
        },
    )

    assert response.status_code == 200, response.text

    return {
        "Authorization": f"Bearer {response.json()['access_token']}"
    }


# ---------------------------------------------------------------------------
# Category fixture
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def category_id(
    client: AsyncClient,
    admin_auth: dict,
) -> int:
    """Create a general category and return its ID."""

    response = await client.post(
        "/api/v1/categories",
        json={
            "name": "General",
            "slug": "general",
            "description": "General questions",
        },
        headers=admin_auth,
    )

    assert response.status_code == 201, response.text

    return response.json()["id"]