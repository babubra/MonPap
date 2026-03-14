"""CRUD API — Субъекты (контрагенты)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Counterpart, User
from app.db.session import get_db
from app.schemas import CounterpartCreate, CounterpartResponse, CounterpartUpdate

router = APIRouter(prefix="/api/counterparts", tags=["counterparts"])


@router.get("", response_model=list[CounterpartResponse])
async def list_counterparts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список субъектов текущего пользователя."""
    result = await db.execute(
        select(Counterpart)
        .where(Counterpart.user_id == user.id)
        .order_by(Counterpart.name)
    )
    return result.scalars().all()


@router.post("", response_model=CounterpartResponse, status_code=status.HTTP_201_CREATED)
async def create_counterpart(
    body: CounterpartCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создание нового субъекта."""
    counterpart = Counterpart(
        user_id=user.id,
        name=body.name,
        ai_hint=body.ai_hint,
    )
    db.add(counterpart)
    await db.flush()
    await db.refresh(counterpart)
    return counterpart


@router.put("/{counterpart_id}", response_model=CounterpartResponse)
async def update_counterpart(
    counterpart_id: int,
    body: CounterpartUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Обновление субъекта."""
    result = await db.execute(
        select(Counterpart).where(
            Counterpart.id == counterpart_id, Counterpart.user_id == user.id
        )
    )
    counterpart = result.scalar_one_or_none()
    if not counterpart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Субъект не найден")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(counterpart, field, value)

    await db.flush()
    await db.refresh(counterpart)
    return counterpart


@router.delete("/{counterpart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_counterpart(
    counterpart_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удаление субъекта."""
    result = await db.execute(
        select(Counterpart).where(
            Counterpart.id == counterpart_id, Counterpart.user_id == user.id
        )
    )
    counterpart = result.scalar_one_or_none()
    if not counterpart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Субъект не найден")

    await db.delete(counterpart)
