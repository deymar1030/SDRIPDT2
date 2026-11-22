"""Script de creación de usuarios (app.scripts.crear_usuario), probado como lo usa Docker: por línea de comandos."""

import os
import pathlib
import subprocess
import sys

import pytest

BACKEND = pathlib.Path(__file__).resolve().parent.parent


def _ejecutar(cliente, **entorno):
    env = {k: v for k, v in os.environ.items() if not k.startswith("INIT_USER_")}
    env.update(entorno)
    return subprocess.run([sys.executable, "-m", "app.scripts.crear_usuario", "--desde-entorno"], cwd=BACKEND, env=env,
                          capture_output=True, text=True, encoding="utf-8")


def _usuario(**kw):
    return {"INIT_USER_CORREO": "Admin.Inicial@Hospital.BO", "INIT_USER_NOMBRE": "Admin Inicial", "INIT_USER_PASSWORD": "1234", **kw}


def test_sin_variables_no_hace_nada(cliente):
    r = _ejecutar(cliente)
    assert r.returncode == 0 and "no se crea ningún usuario" in r.stdout


def test_crea_el_usuario_y_se_puede_iniciar_sesion(cliente):
    r = _ejecutar(cliente, **_usuario())
    assert r.returncode == 0 and "Usuario creado" in r.stdout
    login = cliente.post("/auth/login", data={"username": "ADMIN.inicial@hospital.bo", "password": "1234"})
    assert login.status_code == 200 and login.json()["usuario"]["rol"] == "admin"


def test_es_idempotente_y_no_pisa_la_contrasena(cliente):
    _ejecutar(cliente, **_usuario())
    r = _ejecutar(cliente, **_usuario(INIT_USER_PASSWORD="otra-clave"))
    assert r.returncode == 0 and "ya existe" in r.stdout
    assert cliente.post("/auth/login", data={"username": "admin.inicial@hospital.bo", "password": "1234"}).status_code == 200


def test_actualizar_password_si_se_pide(cliente):
    env = {k: v for k, v in os.environ.items() if not k.startswith("INIT_USER_")} | _usuario(INIT_USER_PASSWORD="nueva-clave")
    r = subprocess.run([sys.executable, "-m", "app.scripts.crear_usuario", "--desde-entorno", "--actualizar-password"], cwd=BACKEND, env=env,
                       capture_output=True, text=True, encoding="utf-8")
    assert r.returncode == 0 and "actualizada" in r.stdout
    assert cliente.post("/auth/login", data={"username": "admin.inicial@hospital.bo", "password": "nueva-clave"}).status_code == 200


@pytest.mark.parametrize("cambio, texto", [
    ({"INIT_USER_CORREO": "no-es-un-correo"}, "correo inválido"),
    ({"INIT_USER_ROL": "root"}, "rol inválido"),
])
def test_rechaza_datos_invalidos(cliente, cambio, texto):
    r = _ejecutar(cliente, **{**_usuario(INIT_USER_CORREO="otro@hospital.bo"), **cambio})
    assert r.returncode == 1 and texto in r.stderr


def test_el_rol_por_defecto_es_admin_y_se_puede_elegir_otro(cliente):
    _ejecutar(cliente, **_usuario(INIT_USER_CORREO="medica@hospital.bo", INIT_USER_ROL="medico"))
    assert cliente.post("/auth/login", data={"username": "medica@hospital.bo", "password": "1234"}).json()["usuario"]["rol"] == "medico"
