from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.nucleo.configuracion import settings
from app.nucleo.base_de_datos import Base
from app import modelos  # noqa: F401  (registra los modelos en Base.metadata)

config = context.config
# configparser interpreta "%": se duplica para que una contraseña con % no rompa la URL.
config.set_main_option("sqlalchemy.url", settings.url_base_datos.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(config.get_section(config.config_ini_section, {}), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
