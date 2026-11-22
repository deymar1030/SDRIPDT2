"""
Crea un usuario del sistema desde la línea de comandos (por ejemplo, el
primer administrador de una base de datos nueva). No hay usuarios
predefinidos en el código: todos se crean con este script o desde la app.

Uso interactivo (pide la contraseña sin mostrarla):
    python -m app.scripts.crear_usuario --correo admin@hospital.bo --nombre "Ana Pérez" --rol admin

Uso no interactivo (Docker, despliegues): lee variables de entorno
    INIT_USER_CORREO, INIT_USER_NOMBRE, INIT_USER_PASSWORD, INIT_USER_ROL (opcional, por defecto admin)
    python -m app.scripts.crear_usuario --desde-entorno
  Si esas variables no están definidas no hace nada. Si el correo ya existe,
  no lo modifica (se puede ejecutar en cada arranque sin efectos).

Opción:
    --actualizar-password   si el correo ya existe, le asigna la nueva contraseña.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import inspect

from ..nucleo.base_de_datos import SessionLocal, engine
from ..modelos import User
from ..nucleo.seguridad import hash_password, normalizar_correo

ROLES = ("admin", "medico")
LARGO_MINIMO_PASSWORD = 1


def _error(mensaje: str) -> None:
    print(f"Error: {mensaje}", file=sys.stderr)
    sys.exit(1)


def _validar(correo: str, nombre: str, password: str, rol: str) -> str:
    try:
        correo = normalizar_correo(validate_email(correo, check_deliverability=False).normalized)
    except EmailNotValidError as e:
        _error(f"correo inválido ({e})")
    if not nombre.strip():
        _error("el nombre no puede estar vacío")
    if rol not in ROLES:
        _error(f"rol inválido «{rol}». Opciones: {', '.join(ROLES)}")
    if len(password) < LARGO_MINIMO_PASSWORD:
        _error(f"la contraseña debe tener al menos {LARGO_MINIMO_PASSWORD} caracteres")
    return correo


def crear_usuario(correo: str, nombre: str, password: str, rol: str, actualizar_password: bool = False) -> str:
    """Devuelve 'creado', 'actualizado' o 'existente'."""
    if "users" not in inspect(engine).get_table_names():
        _error("la base de datos no tiene tablas. Ejecuta primero:  alembic upgrade head")

    db = SessionLocal()
    try:
        existente = db.query(User).filter(User.correo == correo).first()
        if existente:
            if actualizar_password:
                existente.password_hash = hash_password(password)
                db.commit()
                return "actualizado"
            return "existente"
        db.add(User(nombre=nombre.strip(), correo=correo, password_hash=hash_password(password), rol=rol))
        db.commit()
        return "creado"
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Crea un usuario del Simulador IR.")
    parser.add_argument("--correo")
    parser.add_argument("--nombre")
    parser.add_argument("--rol", default="admin", choices=ROLES)
    parser.add_argument("--desde-entorno", action="store_true", help="lee INIT_USER_* de las variables de entorno")
    parser.add_argument("--actualizar-password", action="store_true", help="si el correo ya existe, cambia su contraseña")
    args = parser.parse_args()

    if args.desde_entorno:
        correo = os.environ.get("INIT_USER_CORREO", "").strip()
        nombre = os.environ.get("INIT_USER_NOMBRE", "").strip()
        password = os.environ.get("INIT_USER_PASSWORD", "")
        rol = os.environ.get("INIT_USER_ROL", "admin").strip() or "admin"
        if not (correo and nombre and password):
            print("INIT_USER_* no definidas: no se crea ningún usuario.")
            return
    else:
        if not args.correo or not args.nombre:
            parser.error("--correo y --nombre son obligatorios (o usa --desde-entorno)")
        correo, nombre, rol = args.correo, args.nombre, args.rol
        password = getpass.getpass("Contraseña: ")
        if getpass.getpass("Repite la contraseña: ") != password:
            _error("las contraseñas no coinciden")

    correo = _validar(correo, nombre, password, rol)
    resultado = crear_usuario(correo, nombre, password, rol, args.actualizar_password)
    mensajes = {
        "creado": f"Usuario creado: {correo} (rol {rol}).",
        "actualizado": f"Contraseña actualizada para {correo}.",
        "existente": f"El usuario {correo} ya existe; no se modificó.",
    }
    print(mensajes[resultado])


if __name__ == "__main__":
    main()
