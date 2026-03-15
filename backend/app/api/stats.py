"""API — Статистика по категориям."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Category, Transaction, User
from app.db.session import get_db
from app.schemas import CategoryStats, StatsResponse

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/by-category", response_model=StatsResponse)
async def stats_by_category(
    type: str = Query(..., pattern=r"^(income|expense)$"),
    date_from: date = Query(...),
    date_to: date = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Агрегация сумм транзакций по родительским категориям за период.

    Для расходов — группировка по parent-категории (если есть parent, суммы
    привязанных children складываются в parent). Для доходов — аналогично.
    Транзакции без категории → «Без категории».
    """
    # Определяем «группировочный» ID: parent_id если есть, иначе category_id
    group_id = case(
        (Category.parent_id.isnot(None), Category.parent_id),
        else_=Transaction.category_id,
    )

    query = (
        select(
            group_id.label("group_id"),
            func.sum(Transaction.amount).label("total"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user.id,
            Transaction.type == type,
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
        .group_by(group_id)
        .order_by(func.sum(Transaction.amount).desc())
    )

    result = await db.execute(query)
    rows = result.all()

    # Собираем IDs категорий для получения имён
    cat_ids = [r.group_id for r in rows if r.group_id is not None]
    cat_map: dict[int, Category] = {}
    if cat_ids:
        cats_result = await db.execute(
            select(Category).where(Category.id.in_(cat_ids))
        )
        for cat in cats_result.scalars().all():
            cat_map[cat.id] = cat

    items: list[CategoryStats] = []
    total_sum = 0

    for row in rows:
        total_sum += float(row.total)
        cat = cat_map.get(row.group_id) if row.group_id else None
        items.append(
            CategoryStats(
                category_id=row.group_id,
                category_name=cat.name if cat else "Без категории",
                icon=cat.icon if cat else None,
                total=row.total,
            )
        )

    return StatsResponse(
        items=items,
        total_sum=total_sum,
        period_from=date_from,
        period_to=date_to,
    )
