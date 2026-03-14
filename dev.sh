#!/bin/bash
set -e

# ==========================================
# MonPap — Скрипт для локальной разработки
# ==========================================
# Запускает PostgreSQL в Docker, бэкенд и фронтенд нативно с hot-reload.
# Использование: ./dev.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MonPap — Запуск среды разработки${NC}"
echo ""

# --- Проверка .env ---
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  Файл .env не найден. Копирую из .env.example...${NC}"
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo -e "${YELLOW}📝 Отредактируйте .env и запустите скрипт повторно.${NC}"
    exit 1
fi

# Загружаем переменные
set -a
source "$SCRIPT_DIR/.env"
set +a

# --- PostgreSQL ---
echo -e "${GREEN}🐘 Запускаю PostgreSQL...${NC}"
docker compose -f "$SCRIPT_DIR/docker-compose.dev.yml" up -d

# Ждём готовности
echo -n "   Жду готовности БД"
for i in {1..30}; do
    if docker compose -f "$SCRIPT_DIR/docker-compose.dev.yml" exec -T db pg_isready -U "${POSTGRES_USER:-monpap}" -q 2>/dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# --- Backend ---
echo -e "${GREEN}🐍 Запускаю Backend (FastAPI)...${NC}"

# Создаём venv если не существует
if [ ! -d "$SCRIPT_DIR/backend/.venv" ]; then
    echo "   Создаю виртуальное окружение..."
    python3 -m venv "$SCRIPT_DIR/backend/.venv"
fi

# Устанавливаем зависимости только если requirements.txt изменился
VENV_PIP="$SCRIPT_DIR/backend/.venv/bin/pip"
VENV_PYTHON="$SCRIPT_DIR/backend/.venv/bin/python"
VENV_UVICORN="$SCRIPT_DIR/backend/.venv/bin/uvicorn"
REQ_HASH_FILE="$SCRIPT_DIR/backend/.venv/.req_hash"
CURRENT_HASH=$(md5 -q "$SCRIPT_DIR/backend/requirements.txt" 2>/dev/null || md5sum "$SCRIPT_DIR/backend/requirements.txt" | cut -d' ' -f1)

if [ ! -f "$REQ_HASH_FILE" ] || [ "$(cat "$REQ_HASH_FILE")" != "$CURRENT_HASH" ]; then
    echo "   Устанавливаю зависимости..."
    $VENV_PIP install -q -r "$SCRIPT_DIR/backend/requirements.txt"
    echo "$CURRENT_HASH" > "$REQ_HASH_FILE"
else
    echo "   Зависимости актуальны ✓"
fi

# Запускаем с dev DATABASE_URL
export DATABASE_URL="$DATABASE_URL_DEV"
export DEV_MODE=true
$VENV_UVICORN app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir "$SCRIPT_DIR/backend" &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# --- Frontend ---
echo -e "${GREEN}⚛️  Запускаю Frontend (Vite)...${NC}"

cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Всё запущено!${NC}"
echo -e "   Frontend: ${BLUE}http://localhost:5173${NC}"
echo -e "   Backend:  ${BLUE}http://localhost:8000/docs${NC}"
echo -e "   БД:       ${BLUE}localhost:5432${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}Нажмите Ctrl+C для остановки всех сервисов${NC}"

# Graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Останавливаю сервисы...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    docker compose -f "$SCRIPT_DIR/docker-compose.dev.yml" stop
    echo -e "${GREEN}👋 Готово!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Ждём завершения любого процесса
wait
