"""Administración de cuentas. Solo el rol admin; no hay registro público.

El admin gestiona las cuentas (crear, editar, cambiar de rol, desactivar,
restablecer la contraseña) pero NO tiene acceso a los datos de los pacientes.
Las cuentas no se borran: se desactivan, porque los pacientes registran quién
los creó.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import esquemas, modelos
from ..nucleo.base_de_datos import get_db
from ..nucleo.seguridad import hash_password, normalizar_correo, requiere_admin

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


def _admins_activos(db: Session) -> int:
    return db.query(modelos.User).filter(modelos.User.rol == "admin", modelos.User.activo.is_(True)).count()


@router.get("", response_model=list[esquemas.UserOut])
def listar_usuarios(db: Session = Depends(get_db), _=Depends(requiere_admin)):
    return db.query(modelos.User).order_by(modelos.User.creado_en.asc(), modelos.User.id.asc()).all()


@router.post("", response_model=esquemas.UserOut, status_code=201)
def crear_usuario(datos: esquemas.UsuarioCrear, db: Session = Depends(get_db), _=Depends(requiere_admin)):
    correo = normalizar_correo(datos.correo)
    if db.query(modelos.User).filter(modelos.User.correo == correo).first():
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese correo")
    usuario = modelos.User(
        nombre=datos.nombre.strip(), correo=correo, password_hash=hash_password(datos.password), rol=datos.rol, activo=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}", response_model=esquemas.UserOut)
def actualizar_usuario(
    usuario_id: int,
    datos: esquemas.UsuarioActualizar,
    db: Session = Depends(get_db),
    admin: modelos.User = Depends(requiere_admin),
):
    usuario = db.get(modelos.User, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cambios = datos.model_dump(exclude_unset=True)

    # Salvaguardas para no quedarse sin administrador.
    deja_de_ser_admin_activo = usuario.rol == "admin" and usuario.activo and (
        cambios.get("rol", usuario.rol) != "admin" or cambios.get("activo", usuario.activo) is False
    )
    if deja_de_ser_admin_activo:
        if usuario.id == admin.id:
            raise HTTPException(status_code=400, detail="No puedes quitarte el rol de admin ni desactivar tu propia cuenta")
        if _admins_activos(db) <= 1:
            raise HTTPException(status_code=400, detail="Debe quedar al menos un admin activo")

    if "correo" in cambios and cambios["correo"] is not None:
        correo = normalizar_correo(cambios["correo"])
        if db.query(modelos.User).filter(modelos.User.correo == correo, modelos.User.id != usuario.id).first():
            raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese correo")
        usuario.correo = correo
    if cambios.get("nombre") is not None:
        usuario.nombre = cambios["nombre"].strip()
    if cambios.get("rol") is not None:
        usuario.rol = cambios["rol"]
    if cambios.get("activo") is not None:
        usuario.activo = cambios["activo"]
    if cambios.get("password") is not None:
        usuario.password_hash = hash_password(cambios["password"])

    db.commit()
    db.refresh(usuario)
    return usuario
