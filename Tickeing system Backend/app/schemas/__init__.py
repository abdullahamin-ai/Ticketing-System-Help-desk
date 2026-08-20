"""Schemas package."""
from app.schemas.analytics import (  # noqa: F401
    CountByAgent,
    CountByCategory,
    CountByPriority,
    CountByStatus,
    TicketAnalytics,
)
from app.schemas.attachment import AttachmentDownload, AttachmentRead  # noqa: F401
from app.schemas.audit import AuditLogRead  # noqa: F401
from app.schemas.auth import (  # noqa: F401
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.category import (  # noqa: F401
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
)
from app.schemas.common import (  # noqa: F401
    MessageResponse,
    ORMBase,
    PaginatedResponse,
)
from app.schemas.message import (  # noqa: F401
    MessageCreate,
    MessageRead,
    MessageUpdate,
)
from app.schemas.notification import (  # noqa: F401
    NotificationMarkRead,
    NotificationRead,
)
from app.schemas.ticket import (  # noqa: F401
    TicketAssign,
    TicketCreate,
    TicketDetailRead,
    TicketListItem,
    TicketRead,
    TicketStatusUpdate,
    TicketUpdate,
)
from app.schemas.user import (  # noqa: F401
    UserCreateAdmin,
    UserMinimal,
    UserPasswordUpdate,
    UserRead,
    UserUpdateAdmin,
)
