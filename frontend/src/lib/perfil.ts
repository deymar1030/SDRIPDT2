import type { Escenario, NivelIntervencion, Sedentarismo } from "../types";

export const SEDENTARISMO: Sedentarismo[] = ["activo", "moderado", "severo"];

export const NOMBRE_SEDENTARISMO: Record<Sedentarismo, string> = {
  activo: "Activo",
  moderado: "Moderado",
  severo: "Severo",
};

export const DETALLE_SEDENTARISMO: Record<Sedentarismo, string> = {
  activo: "Hace ejercicio con regularidad",
  moderado: "Actividad ocasional",
  severo: "Casi sin actividad física",
};

export const COLOR_SEDENTARISMO: Record<Sedentarismo, string> = {
  activo: "#2f7d5b",
  moderado: "#b7791f",
  severo: "#b42318",
};

export const NOMBRE_NIVEL: Record<NivelIntervencion, string> = {
  nula: "Sin intervención",
  moderada: "Intervención moderada",
  intensiva: "Intervención intensiva",
  personalizada: "Intervención personalizada",
};

export function textoAntecedente(valor: boolean | null) {
  if (valor == null) return "Antecedente familiar: sin dato";
  return valor ? "Antecedente familiar de DMT2" : "Sin antecedente familiar";
}

export function resumenEscenario(esc: Escenario, sedentarismoActual: Sedentarismo): string {
  if (esc.nivel_intervencion === "nula") return "Mantiene su estilo de vida actual";
  if (esc.nivel_intervencion === "moderada") return "Mejora un nivel de actividad y baja ~3.5 % de IMC";
  if (esc.nivel_intervencion === "intensiva") return "Pasa a activo y baja ~7 % de IMC";
  const p = esc.parametros;
  if (!p) return "Cambio de estilo de vida";
  const imc = p.imc_objetivo ? ` · IMC ${p.imc_objetivo}` : "";
  const inicio = p.inicio_anio > 0 ? ` desde el año ${p.inicio_anio}` : "";
  return `${NOMBRE_SEDENTARISMO[sedentarismoActual]} → ${NOMBRE_SEDENTARISMO[p.sedentarismo]}${imc}${inicio}`;
}

const FACTOR_BASE: Record<Sedentarismo, number> = { activo: 0.15, moderado: 0.6, severo: 1.2 };
const IMPACTO_IMC: Record<Sedentarismo, number> = { activo: 0.05, moderado: 0.1, severo: 0.18 };
const K_VAT_BASE = 0.015;
const IMC_REFERENCIA = 22;

export function tasaDesgasteAdiposo(sedentarismo: Sedentarismo, imc: number) {
  return K_VAT_BASE * FACTOR_BASE[sedentarismo] * (1 + Math.max(0, imc - IMC_REFERENCIA) * IMPACTO_IMC[sedentarismo]);
}

const FACTOR_IMC = { moderada: 0.965, intensiva: 0.93 };

export function cambioPredefinido(nivel: "nula" | "moderada" | "intensiva", sedentarismo: Sedentarismo, imc: number) {
  if (nivel === "nula") return { sedentarismo, imc };
  const reducido = Math.round(Math.min(imc, Math.max(IMC_REFERENCIA, imc * FACTOR_IMC[nivel])) * 10) / 10;
  if (nivel === "intensiva") return { sedentarismo: "activo" as Sedentarismo, imc: reducido };
  return { sedentarismo: SEDENTARISMO[Math.max(0, SEDENTARISMO.indexOf(sedentarismo) - 1)], imc: reducido };
}
