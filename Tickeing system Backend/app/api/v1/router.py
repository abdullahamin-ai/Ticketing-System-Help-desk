"""V1 API router aggregator."""
from fastapi import APIRouter

from app.api.v1 import (
    admin,
    analytics,
    attachments,
    auth,
    categories,
    messages,
    notifications,
    tickets,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(categories.router)
api_router.include_router(tickets.router)
api_router.include_router(messages.router)
api_router.include_router(attachments.router)
api_router.include_router(notifications.router)
api_router.include_router(analytics.router)
api_router.include_router(admin.router)
