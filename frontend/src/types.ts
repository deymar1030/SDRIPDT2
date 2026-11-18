export type Etapa = "sano" | "resistencia" | "prediabetes" | "diabetes";
export type Sedentarismo = "activo" | "moderado" | "severo";
export type NivelIntervencion = "nula" | "moderada" | "intensiva" | "personalizada";

export interface ParametrosIntervencion {
  sedentarismo: Sedentarismo;
  imc_objetivo: number | null;
  inicio_anio: number;
}

export interface DatosEscenario {
  nombre: string;
  nivel_intervencion: NivelIntervencion;
  parametros: ParametrosIntervencion | null;
}

export type Rol = "admin" | "medico";

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
}

export interface NuevoUsuario {
  nombre: string;
  correo: string;
  password: string;
  rol: Rol;
}

export interface CambiosUsuario {
  nombre?: string;
  correo?: string;
  rol?: Rol;
  activo?: boolean;
  password?: string;
}

export interface EstadoPaciente {
  sI0: number;
  kVat: number;
}

export interface Paciente {
  id: number;
  nombre: string;
  edad: number;
  imc: number;
  sedentarismo: Sedentarismo;
  antecedente_familiar: boolean | null;
  notas: string | null;
  creado_en: string;
  estadoLatente: EstadoPaciente;
}

export interface NuevoPaciente {
  nombre: string;
  edad: number;
  imc: number;
  sedentarismo: Sedentarismo;
  antecedente_familiar: boolean;
  notas?: string;
}

export interface Escenario {
  id: number;
  paciente_id: number;
  nombre: string;
  nivel_intervencion: NivelIntervencion;
  parametros?: ParametrosIntervencion | null;
  creado_en: string;
}

export interface BandaValores {
  p10: number;
  p50: number;
  p90: number;
}

export interface PuntoSerie {
  anio: number;
  glucosa: BandaValores;
  insulina: BandaValores;
  homaIR: BandaValores;
  homaBeta: BandaValores;
  deficitBeta: BandaValores;
  masaBeta: BandaValores;
  sensibilidad: BandaValores;
  incidencia: number;
  etapaPct: Record<Etapa, number>;
}

export interface PuntoTrayectoria {
  anio: number;
  glucosa: number;
  insulina: number;
  masaBeta: number;
  sensibilidad: number;
  homaIR: number;
  homaBeta: number;
  deficitBeta: number;
}

export interface PuntoPreDiagnostico {
  anio: number;
  glucosa: BandaValores;
  n: number;
}

export interface EstadoInicial {
  sI0: number;
  kVat: number;
  riesgoVida: number;
  aGen: number;
}

export interface DescripcionCambio {
  sedentarismo: Sedentarismo;
  imc: number;
  inicioAnio: number;
  cambia: boolean;
}

export interface ResultadoEscenario {
  escenarioId: number;
  nombre: string;
  nivelIntervencion: NivelIntervencion;
  serie: PuntoSerie[];
  trayectoriaEjemplo: PuntoTrayectoria[];
  preDiagnostico: PuntoPreDiagnostico[];
  tiemposDiagnostico: number[];
  prob5: number;
  probHorizonte: number;
  etapaMediana: Etapa;
  tiempoMedianoDiagnostico: number | null;
  edadMedianaDiagnostico: number | null;
  tiempoLibreAnios: number;
  sinDiabetesEnHorizonte: boolean;
  estadoInicial: EstadoInicial;
  parametros?: ParametrosIntervencion | null;
  intervencion: DescripcionCambio;
}

export interface VariableAleatoria {
  simbolo: string;
  nombre: string;
  distribucion: string;
  parametros: string;
}

export interface Supuestos {
  variablesAleatorias: VariableAleatoria[];
  parametrosFijos: Record<string, number>;
  basalPaciente: Record<string, number>;
}

export interface SimulateResponse {
  runId: number;
  creadoEn: string;
  pacienteId: number;
  horizonteAnios: number;
  trayectorias: number;
  semilla: number;
  resultados: ResultadoEscenario[];
  supuestos: Supuestos;
}

export interface SimulationRunSummary {
  id: number;
  creado_en: string;
  horizonte_anios: number;
  trayectorias: number;
  nombresEscenarios: string[];
}

export interface UltimaSimulacionResumen {
  prob5: number;
  probHorizonte: number;
  etapaMediana: Etapa;
  creadoEn: string;
}

export interface PacienteRiesgo {
  id: number;
  nombre: string;
  edad: number;
  imc: number;
  sedentarismo: Sedentarismo;
  ultimaSimulacion: UltimaSimulacionResumen | null;
}
