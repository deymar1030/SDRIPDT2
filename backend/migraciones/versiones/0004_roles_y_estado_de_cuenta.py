"""roles admin/médico y estado activo de las cuentas

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-13

Los roles quedan reducidos a dos: admin y medico. Las cuentas con cualquier otro
rol (investigador, docente, laboratorio, paciente) pasan a medico. Se agrega
`activo` para desactivar cuentas sin borrarlas.
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("activo", sa.Boolean, nullable=False, server_default=sa.true()))
    op.execute("UPDATE users SET rol = 'medico' WHERE rol NOT IN ('admin', 'medico')")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("activo")
