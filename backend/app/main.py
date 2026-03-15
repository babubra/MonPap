"""MonPap — Точка входа FastAPI."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.models import Base
from app.db.session import engine
from app.api import auth, categories, counterparts, transactions, debts, settings, ai, sync, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Создание таблиц при старте (dev). В проде — Alembic."""
    print("🚀 MonPap backend starting...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Таблицы БД готовы")
    yield
    print("👋 MonPap backend shutting down...")


app = FastAPI(
    title="MonPap API",
    description="Персональный учёт финансов с AI-парсингом",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS — разрешаем фронтенд в dev-режиме
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",          # Vite dev
        "http://localhost",               # Nginx local
        "https://monpap.mooo.com:10443",  # Production
        "https://monpap.mooo.com",        # Production (без порта)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(counterparts.router)
app.include_router(transactions.router)
app.include_router(debts.router)
app.include_router(settings.router)
app.include_router(ai.router)
app.include_router(sync.router)
app.include_router(stats.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "MonPap", "version": "0.2.0"}
