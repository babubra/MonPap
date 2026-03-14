"""Pydantic-схемы для всех сущностей — Create / Update / Response."""

from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# ── Auth ─────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str = Field(..., min_length=3)


class AuthVerify(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Category ─────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., pattern=r"^(income|expense)$")
    ai_hint: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    type: str | None = Field(None, pattern=r"^(income|expense)$")
    ai_hint: str | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    ai_hint: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Counterpart ──────────────────────────────────────────────────

class CounterpartCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    ai_hint: str | None = None


class CounterpartUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    ai_hint: str | None = None


class CounterpartResponse(BaseModel):
    id: int
    name: str
    ai_hint: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Transaction ──────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    category_id: int | None = None
    type: str = Field(..., pattern=r"^(income|expense)$")
    amount: Decimal = Field(..., gt=0)
    currency: str = "RUB"
    comment: str | None = None
    raw_text: str | None = None
    client_id: str | None = None
    transaction_date: date


class TransactionUpdate(BaseModel):
    category_id: int | None = None
    type: str | None = Field(None, pattern=r"^(income|expense)$")
    amount: Decimal | None = Field(None, gt=0)
    currency: str | None = None
    comment: str | None = None
    transaction_date: date | None = None


class TransactionResponse(BaseModel):
    id: int
    category_id: int | None
    category_name: str | None = None
    type: str
    amount: Decimal
    currency: str
    comment: str | None
    raw_text: str | None
    client_id: str | None
    transaction_date: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionSummary(BaseModel):
    month: str  # "2026-03"
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal


# ── Debt ─────────────────────────────────────────────────────────

class DebtCreate(BaseModel):
    counterpart_id: int | None = None
    direction: str = Field(..., pattern=r"^(gave|took)$")
    amount: Decimal = Field(..., gt=0)
    currency: str = "RUB"
    comment: str | None = None
    raw_text: str | None = None
    client_id: str | None = None
    debt_date: date


class DebtUpdate(BaseModel):
    counterpart_id: int | None = None
    direction: str | None = Field(None, pattern=r"^(gave|took)$")
    amount: Decimal | None = Field(None, gt=0)
    currency: str | None = None
    comment: str | None = None
    debt_date: date | None = None
    is_closed: bool | None = None


class DebtPaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payment_date: date
    comment: str | None = None


class DebtPaymentResponse(BaseModel):
    id: int
    debt_id: int
    amount: Decimal
    payment_date: date
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DebtResponse(BaseModel):
    id: int
    counterpart_id: int | None
    counterpart_name: str | None = None
    direction: str
    amount: Decimal
    paid_amount: Decimal
    currency: str
    comment: str | None
    raw_text: str | None
    client_id: str | None
    debt_date: date
    is_closed: bool
    created_at: datetime
    updated_at: datetime
    payments: list[DebtPaymentResponse] = []

    model_config = {"from_attributes": True}


# ── UserSettings ─────────────────────────────────────────────────

class UserSettingsUpdate(BaseModel):
    custom_prompt: str | None = None
    theme: str | None = Field(None, pattern=r"^(dark|light)$")


class UserSettingsResponse(BaseModel):
    id: int
    custom_prompt: str | None
    theme: str

    model_config = {"from_attributes": True}
