#!/bin/sh
set -e

# 1. Crea o actualiza las tablas (idempotente).
alembic upgrade head

# 2. Crea el usuario inicial si INIT_USER_* están definidas y aún no existe.
python -m app.crear_usuario --desde-entorno

# 3. API. --root-path /api porque nginx la publica bajo /api (así /api/docs funciona).
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --root-path /api \
    --proxy-headers \
    --forwarded-allow-ips '*' \
    --workers "${WEB_CONCURRENCY:-1}"
