"""CRUD API — Транзакции + сводка."""

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import get_current_user
from app.db.models import Category, Transaction, User
from app.db.session import get_db
from app.schemas import (
    TransactionCreate,
    TransactionResponse,
    TransactionSummary,
    TransactionUpdate,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    type: str | None = Query(None, pattern=r"^(income|expense)$"),
    year: int | None = None,
    month: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    category_id: int | None = None,
    search: str | None = None,
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список транзакций с фильтрами, пагинацией и поиском.

    Приоритет периода: date_from/date_to > year+month > year.
    """
    query = (
        select(Transaction)
        .options(joinedload(Transaction.category).joinedload(Category.parent))
        .where(Transaction.user_id == user.id)
    )

    if type:
        query = query.where(Transaction.type == type)

    # Диапазон дат имеет приоритет над year/month
    if date_from or date_to:
        if date_from:
            query = query.where(Transaction.transaction_date >= date_from)
        if date_to:
            query = query.where(Transaction.transaction_date <= date_to)
    else:
        if year:
            query = query.where(extract("year", Transaction.transaction_date) == year)
        if month:
            query = query.where(extract("month", Transaction.transaction_date) == month)

    if category_id is not None:
        query = query.where(Transaction.category_id == category_id)

    if search:
        query = query.where(Transaction.comment.ilike(f"%{search}%"))

    query = query.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    transactions = result.unique().scalars().all()

    # Добавляем category_name
    response = []
    for t in transactions:
        data = TransactionResponse.model_validate(t)
        if t.category:
            if t.category.parent:
                data.category_name = f"{t.category.parent.name} / {t.category.name}"
            else:
                data.category_name = t.category.name
            data.category_icon = t.category.icon or (t.category.parent.icon if t.category.parent else None)
        else:
            data.category_name = None
            data.category_icon = None
        response.append(data)

    return response


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создание новой транзакции."""
    # Проверка дедупликации по client_id
    if body.client_id:
        existing = await db.execute(
            select(Transaction).where(Transaction.client_id == body.client_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Транзакция с таким client_id уже существует",
            )

    transaction = Transaction(
        user_id=user.id,
        **body.model_dump(),
    )
    db.add(transaction)
    await db.flush()

    # Перезагружаем с eager-загрузкой category и category.parent
    result = await db.execute(
        select(Transaction)
        .options(joinedload(Transaction.category).joinedload(Category.parent))
        .where(Transaction.id == transaction.id)
    )
    transaction = result.unique().scalar_one()

    data = TransactionResponse.model_validate(transaction)
    if transaction.category:
        if transaction.category.parent:
            data.category_name = f"{transaction.category.parent.name} / {transaction.category.name}"
        else:
            data.category_name = transaction.category.name
        data.category_icon = transaction.category.icon or (transaction.category.parent.icon if transaction.category.parent else None)
    else:
        data.category_name = None
        data.category_icon = None
    return data


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int,
    body: TransactionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Обновление транзакции."""
    result = await db.execute(
        select(Transaction)
        .options(joinedload(Transaction.category).joinedload(Category.parent))
        .where(Transaction.id == transaction_id, Transaction.user_id == user.id)
    )
    transaction = result.unique().scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транзакция не найдена")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)

    await db.flush()

    # Перезагружаем с eager-загрузкой category и parent
    result = await db.execute(
        select(Transaction)
        .options(joinedload(Transaction.category).joinedload(Category.parent))
        .where(Transaction.id == transaction.id)
    )
    transaction = result.unique().scalar_one()

    data = TransactionResponse.model_validate(transaction)
    if transaction.category:
        if transaction.category.parent:
            data.category_name = f"{transaction.category.parent.name} / {transaction.category.name}"
        else:
            data.category_name = transaction.category.name
        data.category_icon = transaction.category.icon or (transaction.category.parent.icon if transaction.category.parent else None)
    else:
        data.category_name = None
        data.category_icon = None
    return data


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удаление транзакции."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user.id
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транзакция не найдена")

    await db.delete(transaction)


@router.get("/summary", response_model=TransactionSummary)
async def transaction_summary(
    year: int | None = None,
    month: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Сводка доходов/расходов за месяц."""
    today = date.today()
    y = year or today.year
    m = month or today.month

    result = await db.execute(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == "income", Transaction.amount),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("total_income"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == "expense", Transaction.amount),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("total_expense"),
        )
        .where(
            Transaction.user_id == user.id,
            extract("year", Transaction.transaction_date) == y,
            extract("month", Transaction.transaction_date) == m,
        )
    )

    row = result.one()
    total_income = row.total_income
    total_expense = row.total_expense

    return TransactionSummary(
        month=f"{y:04d}-{m:02d}",
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
    )
