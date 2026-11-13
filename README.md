# SDRIPDT2 — Simulador IR

Simulación del Desarrollo de Resistencia a la Insulina y Progresión a Diabetes Tipo 2:
pronóstico individual de progresión a DMT2.

Sistema de dos partes: backend en FastAPI (motor de simulación Monte Carlo) y
frontend en React.

## Backend (FastAPI + SQLite + SQLAlchemy)

```
cd backend
python -m venv .venv
.venv\Scripts\activate          # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env           # y completa JWT_SECRET (ver abajo)
alembic upgrade head             # crea las tablas
python -m app.crear_usuario --correo tu@correo.bo --nombre "Tu Nombre" --rol admin
uvicorn app.main:app --reload --port 8000
```

`JWT_SECRET` es obligatoria (no puede estar vacía; se recomienda una larga y aleatoria); genera una con
`python -c "import secrets; print(secrets.token_urlsafe(48))"`.

No hay usuarios ni pacientes predefinidos: la base empieza vacía. El primer
usuario se crea con `app.crear_usuario`, que pide la contraseña sin
mostrarla. Para despliegues sin interacción, define `INIT_USER_CORREO`,
`INIT_USER_NOMBRE`, `INIT_USER_PASSWORD` (y opcionalmente `INIT_USER_ROL`) y
ejecuta `python -m app.crear_usuario --desde-entorno`; si el usuario ya existe
no lo modifica. Con `--actualizar-password` se puede restablecer la
contraseña de un usuario existente.

Docs interactivas: http://localhost:8000/docs

## Frontend (React + Vite + Tailwind)

```
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173 — el proxy de Vite reenvía `/api/*` al backend en
el puerto 8000, así que ambos deben estar corriendo.

## Despliegue con Docker (Coolify)

`docker-compose.yml` levanta tres servicios: `db` (PostgreSQL 17, datos en
el volumen `postgres-datos`), `backend` (FastAPI; al arrancar aplica las
migraciones y crea el usuario inicial si se definió) y `frontend` (nginx:
sirve la app y reenvía `/api` al backend). Solo `frontend` se publica.

En Coolify:

1. **New Resource → Docker Compose** desde el repositorio
   `deymar1030/SDRIPDT2`, rama `prod/system`, archivo `docker-compose.yml`.
2. En **Environment Variables** define:
   - `POSTGRES_PASSWORD` y `JWT_SECRET` (obligatorias; genera cada una con
     `python -c "import secrets; print(secrets.token_urlsafe(48))"`).
   - Para el primer acceso: `INIT_USER_CORREO`, `INIT_USER_NOMBRE`,
     `INIT_USER_PASSWORD` (y opcionalmente `INIT_USER_ROL`, por defecto `admin`).
     Tras el primer despliegue puedes borrar `INIT_USER_PASSWORD`: el usuario
     ya queda creado en la base.
3. Asigna el **dominio al servicio `frontend`** (puerto 80); Coolify gestiona
   el HTTPS.
4. Deploy. La API queda en `https://tu-dominio/api` y su documentación en
   `https://tu-dominio/api/docs`.

Para crear más usuarios después, desde la terminal del contenedor `backend`
en Coolify: `python -m app.crear_usuario --correo ... --nombre "..." --rol medico`.

En desarrollo local se puede seguir usando SQLite (`DATABASE_URL` en
`backend/.env`) o apuntar a un PostgreSQL con las variables `POSTGRES_*`.

## Qué está implementado

- Login / registro con JWT, pacientes, escenarios e historial persistidos en
  PostgreSQL (o SQLite en desarrollo) vía SQLAlchemy + Alembic.
- Motor de simulación (`backend/app/engine.py`): modelo de dinámica de
  sistemas en tiempo discreto (Δt = 1 semana) con las reglas R1–R7 del
  documento `docs/Modelo_Simulacion_DMT2_LaPaz_Calibrado.pdf` — componentes
  A (estilo de vida), B (tejido periférico), C (páncreas endocrino) y D
  (homeostasis clínica), ancladas al estado inicial de cada paciente real
  (no una cohorte sintética).
- Comparación de hasta 4 escenarios de intervención (nula/moderada/intensiva)
  por paciente, con bandas de incertidumbre (percentil 10–90) sobre glucosa,
  insulina, HOMA-IR y reserva pancreática.

## Qué falta (fuera de alcance de esta vuelta)

- Administración de usuarios desde la app (hoy se crean con
  `app.crear_usuario` o con el registro público).
- Calibración numérica de las reglas R1–R7: los valores de k2, k5, k6, k7,
  etc. son un primer ajuste razonable, no una calibración validada contra
  datos reales de SNIS-VE/SEDES La Paz/IDF — algunos perfiles clínicos
  (ej. pacientes ya en resistencia/prediabetes) todavía muestran poca
  diferencia entre "sin cambios" e "intervención intensiva"; el documento
  mismo deja esta calibración como trabajo pendiente.
