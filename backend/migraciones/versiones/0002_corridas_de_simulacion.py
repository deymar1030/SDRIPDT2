"""agrega simulation_runs (historial de simulaciones)

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-13

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "simulation_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("paciente_id", sa.Integer, sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("horizonte_anios", sa.Integer, nullable=False),
        sa.Column("trayectorias", sa.Integer, nullable=False),
        sa.Column("resultados", sa.JSON, nullable=False),
        sa.Column("supuestos", sa.JSON, nullable=False),
        sa.Column("creado_en", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("simulation_runs")
