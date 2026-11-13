import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

NivelIntervencion = Literal["nula", "moderada", "intensiva", "personalizada"]
IntensidadEjercicio = Literal["ligera", "moderada", "vigorosa"]
Etapa = Literal["sano", "resistencia", "prediabetes", "diabetes"]


# ---------------- Auth / Usuarios ----------------
class UserCreate(BaseModel):
    nombre: str
    correo: EmailStr
    password: str = Field(min_length=6)
    rol: str = "medico"


class UserLogin(BaseModel):
    correo: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    correo: str
    rol: str
    creado_en: dt.datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UserOut


class UserUpdate(BaseModel):
    nombre: str
    correo: EmailStr


class PasswordChange(BaseModel):
    actual: str
    nueva: str = Field(min_length=6)


# ---------------- Pacientes ----------------
class PatientCreate(BaseModel):
    nombre: str
    edad: int = Field(ge=1, le=110)
    sexo: str | None = None
    imc: float = Field(ge=12, le=70)
    peso: float | None = Field(default=None, ge=20, le=300)
    talla: float | None = Field(default=None, ge=100, le=230)
    glucosa: float = Field(ge=40, le=400)
    insulina: float = Field(ge=1, le=100)
    hba1c: float | None = Field(default=None, ge=3, le=15)
    antecedente_familiar: bool | None = None
    hipertension: bool = False
    tabaquismo: bool = False
    notas: str | None = None


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    edad: int
    sexo: str | None
    imc: float
    peso: float | None = None
    talla: float | None = None
    glucosa: float
    insulina: float
    hba1c: float | None
    antecedente_familiar: bool | None
    hipertension: bool
    tabaquismo: bool
    notas: str | None
    creado_en: dt.datetime
    homaIR: float
    etapaActual: Etapa
    estadoLatente: "EstadoInicial"


# ---------------- Escenarios ----------------
class ParametrosIntervencion(BaseModel):
    """Panel configurable del escenario. Ver app/intervencion.py."""
    reduccion_kcal_dia: float = Field(default=0, ge=0, le=1000)
    ejercicio_dias: int = Field(default=0, ge=0, le=7)
    ejercicio_minutos: int = Field(default=0, ge=0, le=180)
    ejercicio_intensidad: IntensidadEjercicio = "moderada"
    inicio_anio: int = Field(default=0, ge=0, le=19)
    duracion_anios: int | None = Field(default=None, ge=1, le=20)  # None = hasta el final del horizonte


class ScenarioCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    nivel_intervencion: NivelIntervencion = "nula"
    parametros: ParametrosIntervencion | None = None


class ScenarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    paciente_id: int
    nombre: str
    nivel_intervencion: NivelIntervencion
    parametros: ParametrosIntervencion | None = None
    creado_en: dt.datetime


# ---------------- Simulación ----------------
class SimulateRequest(BaseModel):
    horizonte_anios: int = Field(default=10, ge=1, le=20)
    trayectorias: int = Field(default=200, ge=50, le=1000)
    escenario_ids: list[int] | None = None  # si es None, usa todos los escenarios guardados del paciente


class BandaValores(BaseModel):
    p10: float
    p50: float
    p90: float


class PuntoAnual(BaseModel):
    anio: int
    glucosa: BandaValores
    insulina: BandaValores
    homaIR: BandaValores
    reserva: BandaValores
    sensibilidad: BandaValores | None = None  # ausente en corridas guardadas antes de agregarse
    adiposo: BandaValores | None = None
    etapaPct: dict[str, float]


class EstadoInicial(BaseModel):
    sI0: float
    cBeta0: float
    mAdip0: float


class ResultadoEscenario(BaseModel):
    escenarioId: int
    nombre: str
    nivelIntervencion: NivelIntervencion
    resumenAnual: list[PuntoAnual]
    prob5: float
    probHorizonte: float
    etapaMediana: Etapa
    edadMedianaInflexion: float | None
    estadoInicial: EstadoInicial
    # Ausentes en corridas guardadas antes de los escenarios configurables:
    parametros: ParametrosIntervencion | None = None
    intervencion: dict | None = None  # efecto resuelto sobre el motor (kcal, dosis R7, ventana)


class VariableAleatoria(BaseModel):
    simbolo: str
    nombre: str
    distribucion: str
    parametros: str


class Supuestos(BaseModel):
    variablesAleatorias: list[VariableAleatoria]
    parametrosFijos: dict[str, float]
    basalPaciente: dict[str, float]


class SimulateResponse(BaseModel):
    runId: int
    creadoEn: dt.datetime
    pacienteId: int
    horizonteAnios: int
    trayectorias: int
    resultados: list[ResultadoEscenario]
    supuestos: Supuestos


# ---------------- Historial de simulaciones ----------------
class SimulationRunSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    creado_en: dt.datetime
    horizonte_anios: int
    trayectorias: int
    nombresEscenarios: list[str] = []


# ---------------- Pacientes en riesgo (priorización) ----------------
class UltimaSimulacionResumen(BaseModel):
    prob5: float
    probHorizonte: float
    etapaMediana: Etapa
    creadoEn: dt.datetime


class PacienteRiesgo(BaseModel):
    id: int
    nombre: str
    edad: int
    imc: float
    etapaActual: Etapa
    ultimaSimulacion: UltimaSimulacionResumen | None


PatientOut.model_rebuild()
