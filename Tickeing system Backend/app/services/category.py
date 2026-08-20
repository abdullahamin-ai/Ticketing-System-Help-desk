"""Category service."""
from typing import Optional, Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import AuditAction, UserRole
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services.audit import AuditService


class CategoryService:
    def __init__(
        self, db: AsyncSession, audit: AuditService | None = None
    ) -> None:
        self.db = db
        self.audit = audit or AuditService(db)

    async def get_by_id(self, category_id: int) -> Category:
        cat = await self.db.get(Category, category_id)
        if cat is None:
            raise NotFoundError(f"Category {category_id} not found")
        return cat

    async def get_by_slug(self, slug: str) -> Optional[Category]:
        stmt = select(Category).where(Category.slug == slug)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_categories(
        self,
        *,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[Sequence[Category], int]:
        stmt = select(Category)
        if search:
            pat = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Category.name).like(pat),
                    func.lower(Category.slug).like(pat),
                )
            )
        if is_active is not None:
            stmt = stmt.where(Category.is_active == is_active)

        total_stmt = select(func.count()).select_from(stmt.subquery())
        total = int((await self.db.execute(total_stmt)).scalar_one() or 0)

        stmt = (
            stmt.order_by(Category.name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def list_all_active(self) -> Sequence[Category]:
        stmt = (
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.name.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(
        self, *, actor, data: CategoryCreate
    ) -> Category:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admins can create categories")

        existing = await self.get_by_slug(data.slug)
        if existing is not None:
            raise ConflictError("Category slug already exists")

        cat = Category(
            name=data.name,
            slug=data.slug,
            description=data.description,
            is_active=data.is_active,
        )
        self.db.add(cat)
        await self.db.flush()
        await self.audit.log(
            actor_id=actor.id,
            action=AuditAction.CATEGORY_CREATED,
            entity_type="category",
            entity_id=cat.id,
            extra_data={"slug": cat.slug},
        )
        return cat

    async def update(
        self, *, actor, category_id: int, data: CategoryUpdate
    ) -> Category:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admins can update categories")

        cat = await self.get_by_id(category_id)
        changes = {}
        if data.name is not None and data.name != cat.name:
            changes["name"] = {"from": cat.name, "to": data.name}
            cat.name = data.name
        if data.description is not None and data.description != cat.description:
            changes["description"] = "updated"
            cat.description = data.description
        if data.is_active is not None and data.is_active != cat.is_active:
            changes["is_active"] = {"from": cat.is_active, "to": data.is_active}
            cat.is_active = data.is_active

        if changes:
            await self.audit.log(
                actor_id=actor.id,
                action=AuditAction.CATEGORY_UPDATED,
                entity_type="category",
                entity_id=cat.id,
                extra_data=changes,
            )
        return cat

    async def delete(self, *, actor, category_id: int) -> None:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admins can delete categories")
        cat = await self.get_by_id(category_id)
        await self.audit.log(
            actor_id=actor.id,
            action=AuditAction.CATEGORY_DELETED,
            entity_type="category",
            entity_id=cat.id,
            extra_data={"slug": cat.slug, "name": cat.name},
        )
        await self.db.delete(cat)
        await self.db.flush()
