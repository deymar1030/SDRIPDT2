import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

NivelIntervencion = Literal["nula", "moderada", "intensiva", "personalizada"]
Sedentarismo = Literal["activo", "moderado", "severo"]
Etapa = Literal["sano", "resistencia", "prediabetes", "diabetes"]


# ---------------- Auth / Usuarios ----------------
Rol = Literal["admin", "medico"]


class UsuarioCrear(BaseModel):
    """Alta de una cuenta por un admin. No hay registro público."""
    nombre: str = Field(min_length=1, max_length=120)
    correo: EmailStr
    password: str = Field(min_length=6)
    rol: Rol = "medico"


class UsuarioActualizar(BaseModel):
    """Cambios de un admin sobre una cuenta; solo se aplican los campos enviados."""
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    correo: EmailStr | None = None
    rol: Rol | None = None
    activo: bool | None = None
    password: str | None = Field(default=None, min_length=6)   # restablecer contraseña


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    correo: str
    rol: str
    activo: bool = True
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
    nombre: str = Field(min_length=1, max_length=160)
    edad: int = Field(ge=18, le=100)
    imc: float = Field(ge=12, le=70)
    sedentarismo: Sedentarismo
    antecedente_familiar: bool
    notas: str | None = None


class EstadoPaciente(BaseModel):
    sI0: float
    kVat: float


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    edad: int
    imc: float
    sedentarismo: Sedentarismo
    antecedente_familiar: bool | None
    notas: str | None
    creado_en: dt.datetime
    estadoLatente: EstadoPaciente


# ---------------- Escenarios ----------------
class ParametrosIntervencion(BaseModel):
    """Cambio de estilo de vida del escenario personalizado."""
    sedentarismo: Sedentarismo
    imc_objetivo: float | None = Field(default=None, ge=12, le=70)
    inicio_anio: int = Field(default=0, ge=0, le=19)


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
    semilla: int | None = Field(default=None, ge=0, le=2**32 - 1)


class BandaValores(BaseModel):
    p10: float
    p50: float
    p90: float


class PuntoSerie(BaseModel):
    anio: float
    glucosa: BandaValores
    insulina: BandaValores
    homaIR: BandaValores
    homaBeta: BandaValores
    deficitBeta: BandaValores
    masaBeta: BandaValores
    sensibilidad: BandaValores
    incidencia: float
    etapaPct: dict[str, float]


class PuntoTrayectoria(BaseModel):
    anio: float
    glucosa: float
    insulina: float
    masaBeta: float
    sensibilidad: float
    homaIR: float
    homaBeta: float
    deficitBeta: float


class PuntoPreDiagnostico(BaseModel):
    anio: float
    glucosa: BandaValores
    n: int


class EstadoInicial(BaseModel):
    sI0: float
    kVat: float
    riesgoVida: float
    aGen: float


class DescripcionCambio(BaseModel):
    sedentarismo: Sedentarismo
    imc: float
    inicioAnio: float
    cambia: bool


class ResultadoEscenario(BaseModel):
    escenarioId: int
    nombre: str
    nivelIntervencion: NivelIntervencion
    serie: list[PuntoSerie]
    trayectoriaEjemplo: list[PuntoTrayectoria]
    preDiagnostico: list[PuntoPreDiagnostico]
    tiemposDiagnostico: list[float]
    prob5: float
    probHorizonte: float
    etapaMediana: Etapa
    tiempoMedianoDiagnostico: float | None
    edadMedianaDiagnostico: float | None
    tiempoLibreAnios: float
    sinDiabetesEnHorizonte: bool
    estadoInicial: EstadoInicial
    parametros: ParametrosIntervencion | None = None
    intervencion: DescripcionCambio


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
    semilla: int
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
    sedentarismo: Sedentarismo
    ultimaSimulacion: UltimaSimulacionResumen | None
