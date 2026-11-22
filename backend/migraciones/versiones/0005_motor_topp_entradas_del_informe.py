"""motor de Topp: el paciente queda con las entradas del informe

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-18

Las entradas del paciente pasan a ser nombre, edad, IMC, sedentarismo y antecedentes.
Se eliminan las columnas de laboratorio y antropometría. Las simulaciones guardadas y los
escenarios personalizados tienen un formato incompatible con el motor nuevo y se descartan.
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

COLUMNAS_ELIMINADAS = ("sexo", "peso", "talla", "glucosa", "insulina", "hba1c", "hipertension", "tabaquismo")


def upgrade() -> None:
    op.execute("DELETE FROM simulation_runs")
    op.execute("DELETE FROM scenarios WHERE nivel_intervencion = 'personalizada'")
    op.execute("UPDATE scenarios SET parametros = NULL")

    with op.batch_alter_table("patients") as batch:
        batch.add_column(sa.Column("sedentarismo", sa.String(20), nullable=False, server_default="moderado"))
        for columna in COLUMNAS_ELIMINADAS:
            batch.drop_column(columna)


def downgrade() -> None:
    with op.batch_alter_table("patients") as batch:
        batch.add_column(sa.Column("sexo", sa.String(30), nullable=True))
        batch.add_column(sa.Column("peso", sa.Float, nullable=True))
        batch.add_column(sa.Column("talla", sa.Float, nullable=True))
        batch.add_column(sa.Column("glucosa", sa.Float, nullable=False, server_default="90"))
        batch.add_column(sa.Column("insulina", sa.Float, nullable=False, server_default="10"))
        batch.add_column(sa.Column("hba1c", sa.Float, nullable=True))
        batch.add_column(sa.Column("hipertension", sa.Boolean, nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column("tabaquismo", sa.Boolean, nullable=False, server_default=sa.false()))
        batch.drop_column("sedentarismo")
