import datetime as dt

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .nucleo.base_de_datos import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    correo: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    rol: Mapped[str] = mapped_column(String(30), default="medico")  # admin | medico
    # Las cuentas no se borran (los pacientes registran quién los creó): se desactivan.
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    creado_en: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    pacientes: Mapped[list["Patient"]] = relationship(back_populates="creado_por")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(160))
    edad: Mapped[int] = mapped_column(Integer)
    imc: Mapped[float] = mapped_column(Float)
    sedentarismo: Mapped[str] = mapped_column(String(20), default="moderado", server_default="moderado")  # activo | moderado | severo
    antecedente_familiar: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_por_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    creado_en: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    creado_por: Mapped["User | None"] = relationship(back_populates="pacientes")
    escenarios: Mapped[list["Scenario"]] = relationship(back_populates="paciente", cascade="all, delete-orphan")
    simulaciones: Mapped[list["SimulationRun"]] = relationship(back_populates="paciente", cascade="all, delete-orphan")


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    nombre: Mapped[str] = mapped_column(String(120))
    nivel_intervencion: Mapped[str] = mapped_column(String(20), default="nula")  # nula | moderada | intensiva | personalizada
    parametros: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # sedentarismo, imc_objetivo, inicio_anio
    creado_en: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    paciente: Mapped["Patient"] = relationship(back_populates="escenarios")


class SimulationRun(Base):
    """Una corrida guardada del simulador: congela los resultados de ese
    momento (incluido el nombre/nivel de cada escenario tal como estaban),
    para poder comparar 'antes' vs 'ahora' aunque los escenarios cambien
    o se borren después."""

    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    horizonte_anios: Mapped[int] = mapped_column(Integer)
    trayectorias: Mapped[int] = mapped_column(Integer)
    resultados: Mapped[list] = mapped_column(JSON)
    supuestos: Mapped[dict] = mapped_column(JSON)
    creado_en: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    paciente: Mapped["Patient"] = relationship(back_populates="simulaciones")
