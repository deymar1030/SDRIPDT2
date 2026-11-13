/* Espejo de backend/app/intervencion.py: se usa para mostrar en vivo, en el
   panel del escenario, el efecto que tendrá sobre el motor. Si se cambian
   las constantes allá, hay que cambiarlas aquí también. */
import type { Escenario, IntensidadEjercicio, NivelIntervencion, ParametrosIntervencion } from "../types";

export const MET: Record<IntensidadEjercicio, number> = { ligera: 3.5, moderada: 6.0, vigorosa: 8.5 };
export const UMBRAL_MET_MIN_OMS = 600;
export const DEFICIT_REFERENCIA_KCAL = 500;
export const TALLA_REFERENCIA_M = 1.62;
export const K_CAL = 7700;

export const NOMBRE_INTENSIDAD: Record<IntensidadEjercicio, string> = {
  ligera: "Caminar",
  moderada: "Bicicleta / trote",
  vigorosa: "Correr / deporte",
};

export const PARAMETROS_VACIOS: ParametrosIntervencion = {
  reduccion_kcal_dia: 0,
  ejercicio_dias: 0,
  ejercicio_minutos: 0,
  ejercicio_intensidad: "moderada",
  inicio_anio: 0,
  duracion_anios: null,
};

/** Plantillas que rellenan el panel; el usuario las ajusta después. */
export const PLANTILLAS: Record<Exclude<NivelIntervencion, "personalizada">, ParametrosIntervencion> = {
  nula: PARAMETROS_VACIOS,
  moderada: { ...PARAMETROS_VACIOS, reduccion_kcal_dia: 300, ejercicio_dias: 5, ejercicio_minutos: 30, ejercicio_intensidad: "ligera" },
  intensiva: { ...PARAMETROS_VACIOS, reduccion_kcal_dia: 500, ejercicio_dias: 5, ejercicio_minutos: 45, ejercicio_intensidad: "moderada" },
};

export function pesoDelPaciente(peso: number | null | undefined, imc: number) {
  if (peso) return { peso, estimado: false };
  return { peso: Math.round(imc * TALLA_REFERENCIA_M ** 2 * 10) / 10, estimado: true };
}

export function hayIntervencion(p: ParametrosIntervencion) {
  return p.reduccion_kcal_dia > 0 || (p.ejercicio_dias > 0 && p.ejercicio_minutos > 0);
}

function iguales(a: ParametrosIntervencion, b: ParametrosIntervencion) {
  return (
    a.reduccion_kcal_dia === b.reduccion_kcal_dia &&
    a.ejercicio_dias === b.ejercicio_dias &&
    a.ejercicio_minutos === b.ejercicio_minutos &&
    (a.ejercicio_dias === 0 || a.ejercicio_intensidad === b.ejercicio_intensidad) &&
    a.inicio_anio === b.inicio_anio &&
    (a.duracion_anios ?? null) === (b.duracion_anios ?? null)
  );
}

/** Nivel que se guarda junto al escenario (lo usa la priorización de riesgo). */
export function nivelDesdeParametros(p: ParametrosIntervencion): NivelIntervencion {
  if (!hayIntervencion(p)) return "nula";
  if (iguales(p, PLANTILLAS.moderada)) return "moderada";
  if (iguales(p, PLANTILLAS.intensiva)) return "intensiva";
  return "personalizada";
}

export function plantillaActiva(p: ParametrosIntervencion): NivelIntervencion {
  return nivelDesdeParametros(p);
}

export interface Efecto {
  kcalDia: number;
  gActSemana: number;
  metMinSemana: number;
  minutosSemana: number;
  balanceSemana: number;
  kgPorMes: number;
  dosisR7: number;
  cumpleOms: boolean;
}

export function calcularEfecto(p: ParametrosIntervencion, peso: number): Efecto {
  const minutosSemana = p.ejercicio_dias * p.ejercicio_minutos;
  const met = MET[p.ejercicio_intensidad];
  const gActSemana = (minutosSemana * met * 3.5 * peso) / 200;
  const metMinSemana = minutosSemana * met;
  const activa = hayIntervencion(p);
  const dDieta = Math.min(1, p.reduccion_kcal_dia / DEFICIT_REFERENCIA_KCAL);
  const dEjercicio = Math.min(1, metMinSemana / UMBRAL_MET_MIN_OMS);
  const balanceSemana = -(7 * p.reduccion_kcal_dia + gActSemana);
  return {
    kcalDia: p.reduccion_kcal_dia,
    gActSemana,
    metMinSemana,
    minutosSemana,
    balanceSemana,
    kgPorMes: (balanceSemana * 30) / 7 / K_CAL,
    dosisR7: activa ? (dDieta + dEjercicio) / 2 : 0,
    cumpleOms: metMinSemana >= UMBRAL_MET_MIN_OMS,
  };
}

/** Resumen corto de un escenario guardado, para la lista del simulador. */
export function resumenEscenario(esc: Escenario): { dieta: string; ejercicio: string; calendario: string | null } {
  const p = esc.parametros;
  if (!p) {
    // Escenarios creados antes del panel configurable: tabla fija del motor.
    if (esc.nivel_intervencion === "moderada") return { dieta: "−15 % del excedente calórico", ejercicio: "+500 kcal/semana", calendario: null };
    if (esc.nivel_intervencion === "intensiva") return { dieta: "−30 % del excedente calórico", ejercicio: "+1200 kcal/semana", calendario: null };
    return { dieta: "Come como siempre", ejercicio: "Sin ejercicio adicional", calendario: null };
  }
  const dieta = p.reduccion_kcal_dia > 0 ? `−${p.reduccion_kcal_dia} kcal/día` : "Come como siempre";
  const ejercicio =
    p.ejercicio_dias > 0 && p.ejercicio_minutos > 0
      ? `${NOMBRE_INTENSIDAD[p.ejercicio_intensidad]} ${p.ejercicio_dias}×${p.ejercicio_minutos} min/sem`
      : "Sin ejercicio adicional";
  let calendario: string | null = null;
  if (hayIntervencion(p) && (p.inicio_anio > 0 || p.duracion_anios)) {
    const desde = p.inicio_anio === 0 ? "desde hoy" : `desde el año ${p.inicio_anio}`;
    calendario = p.duracion_anios ? `${desde}, durante ${p.duracion_anios} ${p.duracion_anios === 1 ? "año" : "años"}` : desde;
  }
  return { dieta, ejercicio, calendario };
}
