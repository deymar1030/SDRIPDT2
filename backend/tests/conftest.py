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
    "nombre": "Paciente de Prueba", "edad": 50, "peso": 85, "talla": 165, "sedentarismo": "moderado",
    "antecedente_familiar": True, "notas": "Sedentaria.",
}


def cabeceras(cliente, correo, password):
    r = cliente.post("/auth/login", data={"username": correo, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def cliente():
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    command.upgrade(cfg, "head")
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_auth(cliente):
    """Cabeceras del primer admin, creado como en un despliegue real: con el script crear_usuario."""
    from app.crear_usuario import crear_usuario

    assert crear_usuario("admin@prueba.bo", "Admin de Prueba", "clave-admin", "admin") == "creado"
    return cabeceras(cliente, "admin@prueba.bo", "clave-admin")


@pytest.fixture(scope="session")
def crear_cuenta(cliente, admin_auth):
    """Crea una cuenta desde el admin (la única forma de crear cuentas) y devuelve la respuesta."""
    def _crear(nombre, correo, password="clave-prueba", rol="medico"):
        return cliente.post("/usuarios", json={"nombre": nombre, "correo": correo, "password": password, "rol": rol}, headers=admin_auth)

    return _crear


@pytest.fixture(scope="session")
def auth(cliente, crear_cuenta):
    """Cabeceras de un médico (la usuaria 'doctora')."""
    r = crear_cuenta("Doctora Prueba", "doctora@prueba.bo", "clave-prueba", "medico")
    assert r.status_code == 201, r.text
    return cabeceras(cliente, "doctora@prueba.bo", "clave-prueba")


@pytest.fixture
def crear_paciente(cliente, auth):
    def _crear(**cambios):
        if "imc" in cambios:
            talla = cambios.setdefault("talla", 170)
            cambios["peso"] = round(cambios.pop("imc") * (talla / 100) ** 2, 1)
        r = cliente.post("/pacientes", json={**PACIENTE_BASE, **cambios}, headers=auth)
        assert r.status_code == 201, r.text
        return r.json()

    return _crear
