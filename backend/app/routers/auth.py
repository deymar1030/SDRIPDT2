from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/registro", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def registrar(datos: schemas.UserCreate, db: Session = Depends(get_db)):
    existe = db.query(models.User).filter(models.User.correo == datos.correo).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese correo")

    usuario = models.User(
        nombre=datos.nombre,
        correo=datos.correo,
        password_hash=hash_password(datos.password),
        rol=datos.rol,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    token = create_access_token(usuario.id)
    return schemas.Token(access_token=token, usuario=usuario)


@router.post("/login", response_model=schemas.Token)
def iniciar_sesion(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(models.User).filter(models.User.correo == form.username).first()
    if not usuario or not verify_password(form.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

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
    if datos.correo != usuario.correo:
        existe = db.query(models.User).filter(models.User.correo == datos.correo, models.User.id != usuario.id).first()
        if existe:
            raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese correo")
    usuario.nombre = datos.nombre
    usuario.correo = datos.correo
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
