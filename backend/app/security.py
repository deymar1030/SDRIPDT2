import datetime as dt

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def normalizar_correo(correo: str) -> str:
    """Los correos se guardan y comparan siempre en minúsculas y sin espacios,
    para que Ana@X.bo y ana@x.bo sean la misma cuenta."""
    return correo.strip().lower()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expira = dt.datetime.utcnow() + dt.timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": expira}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o sesión expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = int(payload.get("sub"))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise credenciales_invalidas

    user = db.get(User, user_id)
    # Una cuenta desactivada deja de funcionar al instante, aunque su token siga vigente.
    if user is None or not user.activo:
        raise credenciales_invalidas
    return user


def requiere_rol(*roles: str):
    """Dependencia de FastAPI: exige sesión y que el usuario tenga uno de los roles."""
    def dependencia(usuario: User = Depends(get_current_user)) -> User:
        if usuario.rol not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para esta acción")
        return usuario
    return dependencia


requiere_admin = requiere_rol("admin")      # gestiona cuentas; no ve datos de pacientes
requiere_medico = requiere_rol("medico")    # registra y ve sus propios pacientes
