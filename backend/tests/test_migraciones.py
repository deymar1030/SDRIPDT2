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


def test_la_migracion_del_motor_conserva_pacientes_y_descarta_lo_incompatible():
    with tempfile.TemporaryDirectory(prefix="migracion-") as d:
        archivo = pathlib.Path(d, "vieja.db")
        url = f"sqlite:///{archivo.as_posix()}"

        _alembic("0004", url)
        con = sqlite3.connect(archivo)
        con.execute("INSERT INTO patients (nombre, edad, sexo, imc, glucosa, insulina, hba1c, antecedente_familiar, hipertension, tabaquismo, creado_en) "
                    "VALUES ('Rosa', 52, 'Femenino', 31.0, 108, 15, 5.9, 1, 0, 0, '2026-01-01 00:00:00')")
        con.execute("INSERT INTO scenarios (paciente_id, nombre, nivel_intervencion, parametros, creado_en) VALUES (1, 'Sin cambios', 'nula', NULL, '2026-01-01 00:00:00')")
        con.execute("INSERT INTO scenarios (paciente_id, nombre, nivel_intervencion, parametros, creado_en) VALUES (1, 'Bici', 'personalizada', '{\"ejercicio_dias\": 4}', '2026-01-01 00:00:00')")
        con.execute("INSERT INTO simulation_runs (paciente_id, horizonte_anios, trayectorias, resultados, supuestos, creado_en) VALUES (1, 5, 100, '[]', '{}', '2026-01-01 00:00:00')")
        con.commit()
        con.close()

        _alembic("head", url)
        con = sqlite3.connect(archivo)
        paciente = con.execute("SELECT nombre, edad, imc, antecedente_familiar, sedentarismo FROM patients").fetchall()
        columnas = {fila[1] for fila in con.execute("PRAGMA table_info(patients)")}
        escenarios = con.execute("SELECT nombre FROM scenarios").fetchall()
        corridas = con.execute("SELECT COUNT(*) FROM simulation_runs").fetchone()[0]
        con.close()

        assert paciente == [("Rosa", 52, 31.0, 1, "moderado")]
        assert columnas.isdisjoint({"sexo", "peso", "talla", "glucosa", "insulina", "hba1c", "hipertension", "tabaquismo"})
        assert escenarios == [("Sin cambios",)]
        assert corridas == 0
