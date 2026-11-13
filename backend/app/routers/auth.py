from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import create_access_token, get_current_user, hash_password, normalizar_correo, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


# No hay registro público: las cuentas las crea un admin (routers/usuarios.py).


@router.post("/login", response_model=schemas.Token)
def iniciar_sesion(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(models.User).filter(models.User.correo == normalizar_correo(form.username)).first()
    if not usuario or not verify_password(form.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not usuario.activo:
        # Se revela solo después de acertar la contraseña, para no confirmar que el correo existe.
        raise HTTPException(status_code=403, detail="Tu cuenta está desactivada. Contacta al administrador.")

    token = create_access_token(usuario.id)
    return schemas.Token(access_token=token, usuario=usuario)


@router.get("/yo", response_model=schemas.UserOut)
def quien_soy(usuario: models.User = Depends(get_current_user)):
    return usuario


@router.patch("/perfil", response_model=schemas.UserOut)
def editar_perfil(
    datos: schemas.UserUpdate,
    db: Session = Depends(get_db),
    usuario: models.User = Depends(get_current_user),
):
    correo = normalizar_correo(datos.correo)
    if correo != usuario.correo:
        existe = db.query(models.User).filter(models.User.correo == correo, models.User.id != usuario.id).first()
        if existe:
            raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese correo")
    usuario.nombre = datos.nombre
    usuario.correo = correo
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_password(
    datos: schemas.PasswordChange,
    db: Session = Depends(get_db),
    usuario: models.User = Depends(get_current_user),
):
    if not verify_password(datos.actual, usuario.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    usuario.password_hash = hash_password(datos.nueva)
    db.commit()
    return None
