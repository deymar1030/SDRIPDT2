from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída de variables de entorno (o de backend/.env).

    Base de datos, una de dos formas:
      - DATABASE_URL completa (p. ej. sqlite:///./app.db para desarrollo local,
        o postgresql://usuario:clave@host:5432/bd), o bien
      - POSTGRES_HOST + POSTGRES_USER + POSTGRES_PASSWORD + POSTGRES_DB
        (+ POSTGRES_PORT): la URL se arma aquí y la contraseña se escapa, así
        que puede contener cualquier carácter.
    """

    database_url: str | None = None
    postgres_host: str | None = None
    postgres_port: int = 5432
    postgres_user: str | None = None
    postgres_password: str | None = None
    postgres_db: str | None = None

    # Obligatoria: sin valor por defecto para que nunca se use una clave conocida.
    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    cors_origins: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def url_base_datos(self) -> str:
        if self.database_url:
            url = self.database_url
        elif self.postgres_host and self.postgres_user and self.postgres_password and self.postgres_db:
            url = (
                f"postgresql+psycopg://{quote_plus(self.postgres_user)}:{quote_plus(self.postgres_password)}"
                f"@{self.postgres_host}:{self.postgres_port}/{quote_plus(self.postgres_db)}"
            )
        else:
            raise RuntimeError(
                "Falta la base de datos: define DATABASE_URL, o POSTGRES_HOST, POSTGRES_USER, "
                "POSTGRES_PASSWORD y POSTGRES_DB."
            )
        # Coolify y otros proveedores entregan postgres:// o postgresql:// sin driver.
        for prefijo in ("postgres://", "postgresql://"):
            if url.startswith(prefijo):
                return "postgresql+psycopg://" + url[len(prefijo):]
        return url

    @property
    def es_sqlite(self) -> bool:
        return self.url_base_datos.startswith("sqlite")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
