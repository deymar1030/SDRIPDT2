"""
Escenarios de intervención configurables.

El modelo solo "entiende" los hábitos a través de dos variables aleatorias
(E_cal: excedente calórico diario, G_act: gasto por actividad semanal) y de
la regla de recuperación R7. Este módulo traduce los parámetros que el
usuario arma en el panel (comida, ejercicio, calendario) a esos tres
efectos, sin agregar variables aleatorias nuevas:

- Alimentación: reducción de X kcal/día → se resta a cada sorteo de E_cal.
- Ejercicio: días × minutos × intensidad (MET) → kcal/semana que se suman
  a cada sorteo de G_act, con la fórmula estándar de gasto por METs:
      kcal/min = MET · 3.5 · peso(kg) / 200
- Calendario: la intervención solo se aplica entre el año de inicio y el
  de fin; fuera de esa ventana el paciente vuelve a sus hábitos basales.
- R7: su intensidad se escala con la "dosis" de la intervención (supuesto
  de calibración, documentado en `dosis_r7`).

Los escenarios guardados antes de esta extensión (sin `parametros`) siguen
usando exactamente la tabla fija INTERVENCION del motor.
"""

from __future__ import annotations

from .engine import INTERVENCION

# Equivalentes metabólicos (Compendium of Physical Activities, valores típicos)
MET = {"ligera": 3.5, "moderada": 6.0, "vigorosa": 8.5}

# Umbral de actividad suficiente de la OMS expresado en MET·min/semana
# (150 min de actividad moderada ≈ 600 MET·min, criterio usado por el IPAQ).
UMBRAL_MET_MIN_OMS = 600.0

# Déficit dietario de referencia en la práctica clínica (≈ 0.5 kg/semana).
DEFICIT_REFERENCIA_KCAL = 500.0

# Talla de referencia para estimar el peso cuando el paciente solo tiene IMC
# registrado (pacientes cargados antes de guardar peso y talla).
TALLA_REFERENCIA_M = 1.62


def peso_del_paciente(peso: float | None, imc: float) -> tuple[float, bool]:
    """(peso en kg, ¿es estimado?)."""
    if peso:
        return float(peso), False
    return round(imc * TALLA_REFERENCIA_M**2, 1), True


def kcal_ejercicio_semana(dias: int, minutos: int, intensidad: str, peso: float) -> float:
    return dias * minutos * MET[intensidad] * 3.5 * peso / 200.0


def met_min_semana(dias: int, minutos: int, intensidad: str) -> float:
    return dias * minutos * MET[intensidad]


def dosis_r7(reduccion_kcal_dia: float, met_min: float) -> float:
    """Fracción (0–1) de la recuperación R7 que se aplica.

    Supuesto de calibración: la mitad de la dosis la aporta la dieta (llega
    a su máximo con el déficit de referencia de 500 kcal/día) y la otra
    mitad el ejercicio (máximo al cumplir los 600 MET·min/semana de la OMS).
    Una intervención que cumple ambas recibe el k7 completo, como los
    niveles fijos originales.
    """
    d_dieta = min(1.0, reduccion_kcal_dia / DEFICIT_REFERENCIA_KCAL)
    d_ejercicio = min(1.0, met_min / UMBRAL_MET_MIN_OMS)
    return round((d_dieta + d_ejercicio) / 2.0, 3)


def resolver_intervencion(nivel: str, parametros: dict | None, peso: float, peso_estimado: bool) -> dict:
    """Efecto concreto de un escenario sobre el motor, semana a semana."""
    if not parametros:
        tabla = INTERVENCION.get(nivel, INTERVENCION["nula"])
        activa = nivel in ("moderada", "intensiva")
        return {
            "modo": "fijo",
            "activa": activa,
            "pctEcal": tabla["d_ecal"],
            "kcalDia": 0.0,
            "gActSemana": tabla["d_gact"],
            "dosisR7": 1.0 if activa else 0.0,
            "semanaInicio": 0,
            "semanaFin": None,
            "pesoUsado": peso,
            "pesoEstimado": peso_estimado,
        }

    kcal_dia = float(parametros.get("reduccion_kcal_dia", 0) or 0)
    dias = int(parametros.get("ejercicio_dias", 0) or 0)
    minutos = int(parametros.get("ejercicio_minutos", 0) or 0)
    intensidad = parametros.get("ejercicio_intensidad", "moderada")
    inicio = int(parametros.get("inicio_anio", 0) or 0)
    duracion = parametros.get("duracion_anios")

    g_act = kcal_ejercicio_semana(dias, minutos, intensidad, peso)
    met_min = met_min_semana(dias, minutos, intensidad)
    activa = kcal_dia > 0 or g_act > 0

    return {
        "modo": "configurable",
        "activa": activa,
        "pctEcal": 0.0,
        "kcalDia": kcal_dia,
        "gActSemana": round(g_act, 1),
        "metMinSemana": round(met_min, 1),
        "dosisR7": dosis_r7(kcal_dia, met_min) if activa else 0.0,
        "semanaInicio": inicio * 52,
        "semanaFin": (inicio + int(duracion)) * 52 if duracion else None,
        "pesoUsado": peso,
        "pesoEstimado": peso_estimado,
    }
