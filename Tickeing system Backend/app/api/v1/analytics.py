"""Analytics routes (admin only)."""
from fastapi import APIRouter, Depends

from app.api.deps import get_analytics_service
from app.core.deps import require_admin
from app.models.user import User
from app.schemas.analytics import TicketAnalytics
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/tickets",
    response_model=TicketAnalytics,
    summary="[Admin] Ticket analytics summary",
)
async def ticket_analytics(
    service: AnalyticsService = Depends(get_analytics_service),
    _actor: User = Depends(require_admin),
) -> TicketAnalytics:
    return await service.summary()
