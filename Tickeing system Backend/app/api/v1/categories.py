"""Category routes."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_category_service
from app.core.deps import get_current_user, require_admin
from app.core.pagination import Page, PageParams
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.category import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get(
    "",
    response_model=Page[CategoryRead],
    summary="List categories (authenticated)",
)
async def list_categories(
    service: CategoryService = Depends(get_category_service),
    _user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> Page[CategoryRead]:
    items, total = await service.list_categories(
        search=search, is_active=is_active, page=page, page_size=page_size
    )
    return Page[CategoryRead].build(
        [CategoryRead.model_validate(c) for c in items],
        total,
        PageParams(page=page, page_size=page_size),
    )


@router.post(
    "",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="[Admin] Create category",
)
async def create_category(
    payload: CategoryCreate,
    service: CategoryService = Depends(get_category_service),
    actor: User = Depends(require_admin),
) -> CategoryRead:
    cat = await service.create(actor=actor, data=payload)
    return CategoryRead.model_validate(cat)


@router.get(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Get category by id",
)
async def get_category(
    category_id: int,
    service: CategoryService = Depends(get_category_service),
    _user: User = Depends(get_current_user),
) -> CategoryRead:
    cat = await service.get_by_id(category_id)
    return CategoryRead.model_validate(cat)


@router.patch(
    "/{category_id}",
    response_model=CategoryRead,
    summary="[Admin] Update category",
)
async def update_category(
    category_id: int,
    payload: CategoryUpdate,
    service: CategoryService = Depends(get_category_service),
    actor: User = Depends(require_admin),
) -> CategoryRead:
    cat = await service.update(actor=actor, category_id=category_id, data=payload)
    return CategoryRead.model_validate(cat)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="[Admin] Delete category",
)
async def delete_category(
    category_id: int,
    service: CategoryService = Depends(get_category_service),
    actor: User = Depends(require_admin),
) -> None:
    await service.delete(actor=actor, category_id=category_id)
    return None
