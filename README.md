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

## Pruebas

```
cd backend
pip install -r requirements-dev.txt
pytest
```

Las pruebas del backend usan una base SQLite temporal creada con las
migraciones reales, así que no tocan la base de desarrollo. Cubren cada archivo
del motor (variables aleatorias, ecuaciones, paciente, simulador, escenarios,
índices y resultados), la validación contra las cuatro personas del informe, el
script `crear_usuario`, las migraciones y toda la API (autenticación, roles,
pacientes, escenarios, simulación, historial y riesgo).

Para ver las cuatro personas del informe contra el simulador:

```
cd backend
python probar_motor.py
```

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

Las demás cuentas las crea el admin desde la pantalla **Usuarios** de la propia
app (no hay registro público). Como alternativa, desde la terminal del contenedor
`backend`: `python -m app.crear_usuario --correo ... --nombre "..." --rol medico`.

En desarrollo local se puede seguir usando SQLite (`DATABASE_URL` en
`backend/.env`) o apuntar a un PostgreSQL con las variables `POSTGRES_*`.

## Qué está implementado

- Login con JWT, pacientes, escenarios e historial persistidos en PostgreSQL (o
  SQLite en desarrollo) vía SQLAlchemy + Alembic.
- **Cuentas y roles, sin registro público.** Solo existen dos roles:
  - **admin**: crea, edita, desactiva y restablece la contraseña de las cuentas
    (pantalla *Usuarios*). **No tiene acceso a los datos de los pacientes**
    (la API responde 403 en todas las rutas de pacientes).
  - **médico**: registra pacientes, arma escenarios, simula y ve el historial,
    solo de **los pacientes que registró él**; los de otro médico responden 404.
  Los pacientes **no son usuarios**: son fichas que registra el médico. Las
  cuentas no se borran, se desactivan (la sesión de una cuenta desactivada deja
  de valer al instante). Un admin no puede desactivarse ni quitarse el rol a sí
  mismo, para no quedarse sin acceso.
- Motor de simulación (`backend/app/motor/`): modelo de Topp et al. del informe
  `docs/INFORMESIMULACION.pdf`, resuelto con el método de Euler a 5 pasos por día
  y repetido con Monte Carlo (NumPy vectorizado). Hay un archivo por sección del
  informe:

  | Informe | Archivo | Contenido |
  |---|---|---|
  | 3.2.1 Constantes y parámetros | `parametros.py` | Constantes de Topp, perfiles de sedentarismo, límites |
  | 3.2.1 Variables aleatorias | `variables_aleatorias.py` | Weibull, Normal, Gamma, Bernoulli, Uniforme |
  | 3.2.2 Ecuaciones 1 a 5 | `ecuaciones.py` | Una función por ecuación y balance homeostático |
  | 3.3.1 `PacienteVirtual` | `paciente.py` | S_I0, k_VAT, riesgo_vida, a_gen |
  | 3.3.1 `SimuladorClinico`, Ec. 6 | `simulador.py` | Bucle de Euler y condición de parada |
  | 3.4.1 Escenarios | `escenarios.py` | Cambios de estilo de vida |
  | 3.4.2 Índices clínicos | `indices_clinicos.py` | HOMA-IR, HOMA-β, déficit beta, etapa |
  | 3.4.2 y 3.4.3 Gráficos | `resultados.py` | Bandas, trayectoria individual, pre-diagnóstico |

- Entradas del paciente: nombre, edad, IMC, sedentarismo (activo, moderado,
  severo) y antecedentes familiares (sí/no).
- Comparación de hasta 4 escenarios de estilo de vida por paciente (sin cambios,
  moderada, intensiva o personalizada). Todos usan los mismos números aleatorios,
  de modo que la diferencia se debe solo al cambio.
- Gráficas del informe en la interfaz: perfil metabólico de 4 gráficas
  (glucemia, HOMA-β, déficit beta, sensibilidad), glucemia antes del diagnóstico,
  tiempo libre de diabetes, incidencia acumulada e histograma del diagnóstico.

## Qué falta

- Validación del modelo con datos locales. Usa las constantes de Topp et al., con
  la velocidad máxima de cambio de la glucemia ajustada para que el déficit de
  células β al diagnóstico sea de 50–60 % (UKPDS). Los resultados son orientativos.
- Todo paciente parte de glucosa 90 mg/dL e insulina 10 µU/mL: no se usan
  laboratorios propios del paciente.
- Sexo, hipertensión y tabaquismo no intervienen en el modelo.
