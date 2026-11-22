FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY alembic.ini ./
COPY migraciones ./migraciones
COPY app ./app
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Usuario sin privilegios. La base de datos es PostgreSQL (servicio "db").
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    && useradd --system --uid 10001 --home-dir /app simulador

USER simulador

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/salud', timeout=4)" || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
