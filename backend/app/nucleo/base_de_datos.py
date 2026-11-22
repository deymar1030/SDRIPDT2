from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .configuracion import settings

if settings.es_sqlite:
    engine = create_engine(settings.url_base_datos, connect_args={"check_same_thread": False})
else:
    # pool_pre_ping descarta conexiones que el servidor cerró (reinicios, timeouts).
    engine = create_engine(settings.url_base_datos, pool_pre_ping=True, pool_size=5, max_overflow=5)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
