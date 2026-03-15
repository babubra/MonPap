"""Sync API — Оффлайн-синхронизация."""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Category, Counterpart, Debt, Transaction, User
from app.db.session import get_db

router = APIRouter(prefix="/api/sync", tags=["sync"])


# ── Схемы для sync ───────────────────────────────────────────────

class SyncOperation(BaseModel):
    """Одна операция из оффлайн-очереди."""
    action: Literal["create", "update", "delete"]
    entity: Literal["transaction", "debt", "category", "counterpart"]
    client_id: str | None = None
    server_id: int | None = None  # Для update/delete
    data: dict = {}


class SyncRequest(BaseModel):
    """Пакет операций для синхронизации."""
    operations: list[SyncOperation]


class SyncResultItem(BaseModel):
    """Результат одной операции."""
    client_id: str | None
    server_id: int | None
    status: str  # "created", "updated", "deleted", "skipped", "error"
    error: str | None = None


class SyncResponse(BaseModel):
    """Ответ на пакетную синхронизацию."""
    results: list[SyncResultItem]
    synced_at: str


# ── Маппинг сущностей ────────────────────────────────────────────

ENTITY_MAP = {
    "transaction": Transaction,
    "debt": Debt,
    "category": Category,
    "counterpart": Counterpart,
}

# Поля, которые нельзя устанавливать через sync
PROTECTED_FIELDS = {"id", "user_id", "created_at", "updated_at"}


@router.post("", response_model=SyncResponse)
async def sync_operations(
    body: SyncRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Batch-синхронизация оффлайн-операций.

    Принимает массив операций, выполняет их последовательно,
    дедуплицирует по client_id. Возвращает маппинг client_id → server_id.
    """
    results: list[SyncResultItem] = []

    for op in body.operations:
        try:
            model_class = ENTITY_MAP.get(op.entity)
            if not model_class:
                results.append(SyncResultItem(
                    client_id=op.client_id,
                    server_id=None,
                    status="error",
                    error=f"Неизвестная сущность: {op.entity}",
                ))
                continue

            if op.action == "create":
                result = await _handle_create(db, model_class, op, user)
            elif op.action == "update":
                result = await _handle_update(db, model_class, op, user)
            elif op.action == "delete":
                result = await _handle_delete(db, model_class, op, user)
            else:
                result = SyncResultItem(
                    client_id=op.client_id,
                    server_id=None,
                    status="error",
                    error=f"Неизвестное действие: {op.action}",
                )

            results.append(result)

        except Exception as e:
            results.append(SyncResultItem(
                client_id=op.client_id,
                server_id=op.server_id,
                status="error",
                error=str(e),
            ))

    await db.flush()

    return SyncResponse(
        results=results,
        synced_at=datetime.now(timezone.utc).isoformat(),
    )


async def _handle_create(
    db: AsyncSession,
    model_class,
    op: SyncOperation,
    user: User,
) -> SyncResultItem:
    """Создание записи с дедупликацией по client_id."""
    # Дедупликация
    if op.client_id and hasattr(model_class, "client_id"):
        existing = await db.execute(
            select(model_class).where(model_class.client_id == op.client_id)
        )
        found = existing.scalar_one_or_none()
        if found:
            return SyncResultItem(
                client_id=op.client_id,
                server_id=found.id,
                status="skipped",
            )

    # Чистим данные
    clean_data = {k: v for k, v in op.data.items() if k not in PROTECTED_FIELDS}
    clean_data["user_id"] = user.id
    if op.client_id and hasattr(model_class, "client_id"):
        clean_data["client_id"] = op.client_id

    obj = model_class(**clean_data)
    db.add(obj)
    await db.flush()

    return SyncResultItem(
        client_id=op.client_id,
        server_id=obj.id,
        status="created",
    )


async def _handle_update(
    db: AsyncSession,
    model_class,
    op: SyncOperation,
    user: User,
) -> SyncResultItem:
    """Обновление записи по server_id или client_id."""
    query = select(model_class).where(model_class.user_id == user.id)

    if op.server_id:
        query = query.where(model_class.id == op.server_id)
    elif op.client_id and hasattr(model_class, "client_id"):
        query = query.where(model_class.client_id == op.client_id)
    else:
        return SyncResultItem(
            client_id=op.client_id,
            server_id=op.server_id,
            status="error",
            error="Нужен server_id или client_id для update",
        )

    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        return SyncResultItem(
            client_id=op.client_id,
            server_id=op.server_id,
            status="error",
            error="Запись не найдена",
        )

    clean_data = {k: v for k, v in op.data.items() if k not in PROTECTED_FIELDS}
    for field, value in clean_data.items():
        setattr(obj, field, value)

    await db.flush()

    return SyncResultItem(
        client_id=op.client_id,
        server_id=obj.id,
        status="updated",
    )


async def _handle_delete(
    db: AsyncSession,
    model_class,
    op: SyncOperation,
    user: User,
) -> SyncResultItem:
    """Удаление записи по server_id или client_id."""
    query = select(model_class).where(model_class.user_id == user.id)

    if op.server_id:
        query = query.where(model_class.id == op.server_id)
    elif op.client_id and hasattr(model_class, "client_id"):
        query = query.where(model_class.client_id == op.client_id)
    else:
        return SyncResultItem(
            client_id=op.client_id,
            server_id=op.server_id,
            status="error",
            error="Нужен server_id или client_id для delete",
        )

    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        return SyncResultItem(
            client_id=op.client_id,
            server_id=op.server_id,
            status="skipped",
        )

    server_id = obj.id
    await db.delete(obj)

    return SyncResultItem(
        client_id=op.client_id,
        server_id=server_id,
        status="deleted",
    )


@router.get("/changes")
async def get_changes(
    since: str = Query(..., description="ISO timestamp — получить изменения после этого момента"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получение изменений с сервера для синхронизации.

    Возвращает все записи, обновлённые после указанного timestamp.
    """
    try:
        since_dt = datetime.fromisoformat(since)
    except ValueError:
        since_dt = datetime.min.replace(tzinfo=timezone.utc)

    changes: dict = {}

    # Транзакции
    result = await db.execute(
        select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.updated_at > since_dt,
        )
    )
    transactions = result.scalars().all()
    if transactions:
        changes["transactions"] = [
            {
                "id": t.id,
                "client_id": t.client_id,
                "type": t.type,
                "amount": str(t.amount),
                "currency": t.currency,
                "category_id": t.category_id,
                "comment": t.comment,
                "transaction_date": t.transaction_date.isoformat(),
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            }
            for t in transactions
        ]

    # Долги
    result = await db.execute(
        select(Debt).where(
            Debt.user_id == user.id,
            Debt.updated_at > since_dt,
        )
    )
    debts = result.scalars().all()
    if debts:
        changes["debts"] = [
            {
                "id": d.id,
                "client_id": d.client_id,
                "direction": d.direction,
                "amount": str(d.amount),
                "paid_amount": str(d.paid_amount),
                "currency": d.currency,
                "counterpart_id": d.counterpart_id,
                "comment": d.comment,
                "debt_date": d.debt_date.isoformat(),
                "is_closed": d.is_closed,
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in debts
        ]

    # Категории (нет updated_at, возвращаем все)
    result = await db.execute(
        select(Category).where(Category.user_id == user.id)
    )
    all_categories = result.scalars().all()
    changes["categories"] = [
        {
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "ai_hint": c.ai_hint,
        }
        for c in all_categories
    ]

    # Субъекты (нет updated_at, возвращаем все)
    result = await db.execute(
        select(Counterpart).where(Counterpart.user_id == user.id)
    )
    all_counterparts = result.scalars().all()
    changes["counterparts"] = [
        {
            "id": cp.id,
            "name": cp.name,
            "ai_hint": cp.ai_hint,
        }
        for cp in all_counterparts
    ]

    return {
        "changes": changes,
        "server_time": datetime.now(timezone.utc).isoformat(),
    }
