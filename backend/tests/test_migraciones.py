"""Migraciones sobre una base que ya tenía datos (como la de producción)."""

import os
import pathlib
import sqlite3
import subprocess
import sys
import tempfile

BACKEND = pathlib.Path(__file__).resolve().parent.parent


def _alembic(destino, url):
    env = {**os.environ, "DATABASE_URL": url, "JWT_SECRET": "clave-solo-para-pruebas"}
    r = subprocess.run([sys.executable, "-m", "alembic", "upgrade", destino], cwd=BACKEND, env=env, capture_output=True, text=True, encoding="utf-8")
    assert r.returncode == 0, r.stderr


def test_la_migracion_de_roles_conserva_las_cuentas_y_normaliza_los_roles():
    with tempfile.TemporaryDirectory(prefix="migracion-") as d:
        archivo = pathlib.Path(d, "vieja.db")
        url = f"sqlite:///{archivo.as_posix()}"

        _alembic("0003", url)                                          # base tal como estaba antes de los roles
        con = sqlite3.connect(archivo)
        filas = [("Admin", "admin@x.bo", "admin"), ("Doc", "doc@x.bo", "medico"), ("Inv", "inv@x.bo", "investigador"),
                 ("Dce", "dce@x.bo", "docente"), ("Lab", "lab@x.bo", "laboratorio"), ("Pac", "pac@x.bo", "paciente")]
        con.executemany("INSERT INTO users (nombre, correo, password_hash, rol, creado_en) VALUES (?, ?, 'hash', ?, '2026-01-01 00:00:00')",
                        [(n, c, r) for n, c, r in filas])
        con.commit()
        con.close()

        _alembic("head", url)                                          # aplica 0004
        con = sqlite3.connect(archivo)
        resultado = {c: (r, a) for c, r, a in con.execute("SELECT correo, rol, activo FROM users")}
        con.close()

        assert resultado["admin@x.bo"] == ("admin", 1)                 # el admin se conserva
        for correo in ("doc@x.bo", "inv@x.bo", "dce@x.bo", "lab@x.bo", "pac@x.bo"):
            assert resultado[correo] == ("medico", 1), correo          # el resto pasa a médico, y todas siguen activas
        assert len(resultado) == len(filas)                            # no se perdió ninguna cuenta
