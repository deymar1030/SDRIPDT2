# Backend — Simulador IR

API en FastAPI que guarda pacientes y escenarios y ejecuta el motor de simulación.
Todo está nombrado en español y organizado por capas:

```
backend/
├─ app/
│  ├─ main.py              Punto de entrada: crea la API y registra las rutas
│  ├─ api/                 Capa HTTP: una ruta por recurso
│  │  ├─ autenticacion.py     inicio de sesión y perfil
│  │  ├─ pacientes.py         pacientes, escenarios, simulación e historial
│  │  └─ usuarios.py          cuentas (solo administrador)
│  ├─ nucleo/              Piezas de base que usa todo lo demás
│  │  ├─ configuracion.py     variables de entorno (clave JWT, base de datos…)
│  │  ├─ base_de_datos.py     conexión a SQLite/PostgreSQL
│  │  └─ seguridad.py         contraseñas, tokens y roles
│  ├─ modelos.py           Tablas de la base de datos (SQLAlchemy)
│  ├─ esquemas.py          Forma y validación de lo que entra y sale de la API
│  ├─ motor/               Simulación del informe (un archivo por sección)
│  └─ scripts/             Comandos que se ejecutan a mano
│     ├─ crear_usuario.py     crea cuentas desde la terminal o el entorno
│     └─ probar_motor.py      corre las 4 personas del informe
├─ migraciones/            Historial de cambios de la base de datos (Alembic)
├─ pruebas/                Pruebas automáticas (pytest)
├─ alembic.ini             Configuración de Alembic
├─ Dockerfile              Imagen del backend
└─ docker-entrypoint.sh    Al arrancar: migra la base, crea el usuario inicial y levanta la API
```

Flujo de una petición: `main.py` → `api/*` (valida con `esquemas.py` y exige el rol con
`nucleo/seguridad.py`) → `modelos.py` / `motor/` → respuesta.

## Comandos

```
alembic upgrade head                        # crea o actualiza las tablas
python -m app.scripts.crear_usuario --help  # crear cuentas
python -m app.scripts.probar_motor          # las 4 personas del informe
uvicorn app.main:app --reload --port 8000   # API en desarrollo
pytest                                      # pruebas
```
