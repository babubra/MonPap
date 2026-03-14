#!/bin/bash
# Простой скрипт для обновления и деплоя контейнеров в Production

echo "Остановка старых контейнеров..."
docker compose -f docker-compose.prod.yml down

echo "Сборка контейнеров..."
docker compose -f docker-compose.prod.yml build

echo "Запуск приложения в production-режиме..."
docker compose -f docker-compose.prod.yml up -d

echo "✅ Деплой завершён."
docker compose -f docker-compose.prod.yml ps
