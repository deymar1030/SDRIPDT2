export type Etapa = "sano" | "resistencia" | "prediabetes" | "diabetes";
export type NivelIntervencion = "nula" | "moderada" | "intensiva" | "personalizada";
export type IntensidadEjercicio = "ligera" | "moderada" | "vigorosa";

export interface ParametrosIntervencion {
  reduccion_kcal_dia: number;
  ejercicio_dias: number;
  ejercicio_minutos: number;
  ejercicio_intensidad: IntensidadEjercicio;
  inicio_anio: number;
  duracion_anios: number | null;
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

export interface Paciente {
  id: number;
  nombre: string;
  edad: number;
  sexo: string | null;
  imc: number;
  peso?: number | null;
  talla?: number | null;
  glucosa: number;
  insulina: number;
  hba1c: number | null;
  antecedente_familiar: boolean | null;
  hipertension: boolean;
  tabaquismo: boolean;
  notas: string | null;
  creado_en: string;
  homaIR: number;
  etapaActual: Etapa;
  estadoLatente: EstadoInicial;
}

export interface NuevoPaciente {
  nombre: string;
  edad: number;
  sexo?: string;
  imc: number;
  peso?: number;
  talla?: number;
  glucosa: number;
  insulina: number;
  hba1c?: number;
  antecedente_familiar?: boolean | null;
  hipertension?: boolean;
  tabaquismo?: boolean;
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

export interface PuntoAnual {
  anio: number;
  glucosa: BandaValores;
  insulina: BandaValores;
  homaIR: BandaValores;
  reserva: BandaValores;
  sensibilidad?: BandaValores | null;
  adiposo?: BandaValores | null;
  etapaPct: Record<Etapa, number>;
}

export interface EstadoInicial {
  sI0: number;
  cBeta0: number;
  mAdip0: number;
}

export interface ResultadoEscenario {
  escenarioId: number;
  nombre: string;
  nivelIntervencion: NivelIntervencion;
  resumenAnual: PuntoAnual[];
  prob5: number;
  probHorizonte: number;
  etapaMediana: Etapa;
  edadMedianaInflexion: number | null;
  estadoInicial: EstadoInicial;
  parametros?: ParametrosIntervencion | null;
  intervencion?: Record<string, unknown> | null;
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
  etapaActual: Etapa;
  ultimaSimulacion: UltimaSimulacionResumen | null;
}
