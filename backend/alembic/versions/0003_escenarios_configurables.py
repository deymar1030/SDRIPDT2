"""escenarios configurables: parámetros JSON por escenario y peso/talla del paciente

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-13

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("scenarios") as batch:
        batch.add_column(sa.Column("parametros", sa.JSON, nullable=True))
    with op.batch_alter_table("patients") as batch:
        batch.add_column(sa.Column("peso", sa.Float, nullable=True))
        batch.add_column(sa.Column("talla", sa.Float, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("patients") as batch:
        batch.drop_column("talla")
        batch.drop_column("peso")
    with op.batch_alter_table("scenarios") as batch:
        batch.drop_column("parametros")
