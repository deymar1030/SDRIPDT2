"""Fixtures de las pruebas. Todo corre contra una base SQLite TEMPORAL creada
con las migraciones reales de Alembic: nunca se toca la base de desarrollo."""

import os
import pathlib
import tempfile

# Debe hacerse ANTES de importar `app`, porque la configuración se lee al importar.
_DIRECTORIO = tempfile.mkdtemp(prefix="simulador-pruebas-")
os.environ["DATABASE_URL"] = f"sqlite:///{pathlib.Path(_DIRECTORIO, 'pruebas.db').as_posix()}"
os.environ["JWT_SECRET"] = "clave-solo-para-pruebas"
for _v in ("POSTGRES_HOST", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"):
    os.environ.pop(_v, None)

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

BACKEND = pathlib.Path(__file__).resolve().parent.parent

PACIENTE_BASE = {
    "nombre": "Paciente de Prueba", "edad": 50, "sexo": "Femenino", "imc": 30.9, "peso": 79, "talla": 160,
    "glucosa": 108, "insulina": 15, "hba1c": 5.9, "antecedente_familiar": True,
    "hipertension": False, "tabaquismo": False, "notas": "Sedentaria.",
}


@pytest.fixture(scope="session")
def cliente():
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    command.upgrade(cfg, "head")
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth(cliente):
    """Cabeceras de un usuario ya registrado."""
    r = cliente.post("/auth/registro", json={"nombre": "Doctora Prueba", "correo": "doctora@prueba.bo", "password": "clave-prueba", "rol": "medico"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def crear_paciente(cliente, auth):
    def _crear(**cambios):
        r = cliente.post("/pacientes", json={**PACIENTE_BASE, **cambios}, headers=auth)
        assert r.status_code == 201, r.text
        return r.json()

    return _crear
