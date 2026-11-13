"""esquema inicial: users, patients, scenarios

Revision ID: 0001
Revises:
Create Date: 2026-11-12

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("correo", sa.String(160), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(200), nullable=False),
        sa.Column("rol", sa.String(30), nullable=False, server_default="medico"),
        sa.Column("creado_en", sa.DateTime, nullable=False),
    )
    op.create_index("ix_users_correo", "users", ["correo"], unique=True)

    op.create_table(
        "patients",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nombre", sa.String(160), nullable=False),
        sa.Column("edad", sa.Integer, nullable=False),
        sa.Column("sexo", sa.String(30), nullable=True),
        sa.Column("imc", sa.Float, nullable=False),
        sa.Column("glucosa", sa.Float, nullable=False),
        sa.Column("insulina", sa.Float, nullable=False),
        sa.Column("hba1c", sa.Float, nullable=True),
        sa.Column("antecedente_familiar", sa.Boolean, nullable=True),
        sa.Column("hipertension", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("tabaquismo", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("creado_por_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("creado_en", sa.DateTime, nullable=False),
    )

    op.create_table(
        "scenarios",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("paciente_id", sa.Integer, sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("nivel_intervencion", sa.String(20), nullable=False, server_default="nula"),
        sa.Column("creado_en", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("scenarios")
    op.drop_table("patients")
    op.drop_index("ix_users_correo", table_name="users")
    op.drop_table("users")
