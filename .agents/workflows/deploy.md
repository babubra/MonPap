---
description: Деплой MonPap на production VPS
---

# Деплой MonPap на Production

## Данные сервера

- **IP**: 45.90.99.67
- **SSH**: `ssh -p 1022 root@45.90.99.67` (пароль вводит пользователь)
- **Проект на сервере**: `/root/MonPap`
- **Домен**: https://monpap.mooo.com:10443
- **DNS**: monpap.mooo.com → 45.90.99.67 (freedns.afraid.org / mooo.com)
- **Порт приложения**: 10443 (HTTPS) — порт 443 занят xray/3x-ui
- **Firewall**: UFW (порт 10443 открыт)

## Архитектура

- **Frontend**: React 19 PWA (Vite) → собирается в nginx:alpine контейнер
- **Backend**: FastAPI + Uvicorn → python:3.12-slim контейнер
- **БД**: PostgreSQL 16 Alpine → отдельный контейнер
- **SSL**: Let's Encrypt через acme.sh (уже установлен на сервере)
- **SMTP**: Gmail через порт 587 (STARTTLS) — порт 465 заблокирован хостером Datalix
- **Docker Compose**: `docker-compose.prod.yml`

## Стандартное обновление (после изменений в коде)

// turbo-all

1. Закоммитить и запушить изменения:
```bash
cd /Users/fatau/TEST/MonPap && git add -A && git commit -m "описание" && git push
```

2. Подключиться к серверу, подтянуть изменения и пересобрать:
```bash
ssh -o ServerAliveInterval=30 -p 1022 root@45.90.99.67 "cd /root/MonPap && git pull && docker compose -f docker-compose.prod.yml up -d --build && docker compose -f docker-compose.prod.yml ps"
```

Сборка на 1 vCore занимает ~1-2 минуты (backend кешируется, frontend ~60 сек).

## Обновление только backend (быстрее)

```bash
ssh -o ServerAliveInterval=30 -p 1022 root@45.90.99.67 "cd /root/MonPap && git pull && docker compose -f docker-compose.prod.yml up -d --build backend"
```

## Обновление только frontend

```bash
ssh -o ServerAliveInterval=30 -p 1022 root@45.90.99.67 "cd /root/MonPap && git pull && docker compose -f docker-compose.prod.yml up -d --build frontend"
```

## Просмотр логов

```bash
# Все логи
ssh -p 1022 root@45.90.99.67 "cd /root/MonPap && docker compose -f docker-compose.prod.yml logs --tail 50"

# Только backend
ssh -p 1022 root@45.90.99.67 "cd /root/MonPap && docker compose -f docker-compose.prod.yml logs backend --tail 30"

# Только frontend (nginx)
ssh -p 1022 root@45.90.99.67 "cd /root/MonPap && docker compose -f docker-compose.prod.yml logs frontend --tail 30"
```

## Перезапуск сервисов

```bash
# Полный перезапуск
ssh -p 1022 root@45.90.99.67 "cd /root/MonPap && docker compose -f docker-compose.prod.yml restart"

# Перезапуск одного сервиса
ssh -p 1022 root@45.90.99.67 "cd /root/MonPap && docker compose -f docker-compose.prod.yml restart backend"
```

## Статус контейнеров

```bash
ssh -p 1022 root@45.90.99.67 "cd /root/MonPap && docker compose -f docker-compose.prod.yml ps"
```

## SSL-сертификат

**Автообновление**: cron acme.sh запускается ежедневно (39 17 * * *).
Он временно открывает порт 80, обновляет сертификаты, закрывает порт 80.

Сертификаты: `/root/cert/monpap.mooo.com/` → монтируются в nginx как `/etc/nginx/ssl/`

**Ручное обновление SSL** (если нужно):
```bash
ssh -p 1022 root@45.90.99.67 "ufw allow 80/tcp && ~/.acme.sh/acme.sh --renew -d monpap.mooo.com --force && ufw deny 80/tcp && docker compose -f /root/MonPap/docker-compose.prod.yml restart frontend"
```

## Переменные окружения

Файл `.env` на сервере: `/root/MonPap/.env`
- `SMTP_PORT=587` (НЕ 465 — заблокирован хостером)
- `SMTP_HOST=smtp.gmail.com`
- Пароли и ключи сгенерированы при первом деплое

## Важные нюансы

1. **Порт 465 заблокирован** хостером Datalix → используем 587 (STARTTLS)
2. **Порт 443 занят** xray/3x-ui → приложение на порту 10443
3. **Порт 80 по умолчанию DENY** в UFW → открывается только для обновления SSL
4. **SSH на порту 1022** (не стандартный 22)
5. **Service Worker** может кешировать старый фронтенд — при крупных обновлениях может потребоваться Ctrl+Shift+R
6. **БД создаётся через create_all** (нет Alembic миграций) — при изменении моделей нужно аккуратно
7. **Git remote**: https://github.com/babubra/MonPap.git
