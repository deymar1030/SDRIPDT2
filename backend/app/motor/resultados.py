"""Informe 3.4.2 y 3.4.3 · Resultados y gráficos de salida: bandas Monte Carlo, trayectoria individual y pre-diagnóstico."""
import numpy as np

from . import indices_clinicos as ic
from . import parametros as p
from .simulador import Evolucion

MIN_DIAGNOSTICADOS_PRE = 5
MAX_TRIMESTRES_PRE = 60


def _banda(valores: np.ndarray, decimales: int = 2) -> dict:
    p10, p50, p90 = np.percentile(valores, p.PERCENTILES, axis=-1)
    return {"p10": round(float(p10), decimales), "p50": round(float(p50), decimales), "p90": round(float(p90), decimales)}


def _bandas_por_tiempo(matriz: np.ndarray, decimales: int = 2) -> list[dict]:
    return [_banda(fila, decimales) for fila in matriz]


def serie_trimestral(ev: Evolucion) -> list[dict]:
    homa = ic.homa_ir(ev.glucosa, ev.insulina)
    homa_b = ic.homa_beta(ev.glucosa, ev.insulina)
    deficit = ic.deficit_beta(ev.masa_beta)
    masa = ic.masa_beta_pct(ev.masa_beta)
    serie = []
    for k, dia in enumerate(ev.dias_registro):
        diagnosticado = ev.dias_diagnostico <= dia
        serie.append({
            "anio": round(float(dia) / p.DIAS_POR_ANIO, 3),
            "glucosa": _banda(ev.glucosa[k]),
            "insulina": _banda(ev.insulina[k]),
            "homaIR": _banda(homa[k]),
            "homaBeta": _banda(homa_b[k], 1),
            "deficitBeta": _banda(deficit[k], 1),
            "masaBeta": _banda(masa[k], 1),
            "sensibilidad": _banda(ev.sensibilidad[k], 3),
            "incidencia": round(float(diagnosticado.mean() * 100), 1),
            "etapaPct": ic.porcentaje_por_etapa(ev.glucosa[k], homa[k], diagnosticado),
        })
    return serie


def _indice_trayectoria_ejemplo(ev: Evolucion) -> int:
    diag = ev.diagnosticados
    if diag.any():
        tiempos = np.where(diag, ev.dias_diagnostico, np.nan)
        objetivo = np.nanmedian(tiempos)
        return int(np.nanargmin(np.abs(tiempos - objetivo)))
    final = ev.glucosa[-1]
    return int(np.argsort(final)[len(final) // 2])


def trayectoria_ejemplo(ev: Evolucion) -> list[dict]:
    m = _indice_trayectoria_ejemplo(ev)
    dia_diag = ev.dias_diagnostico[m]
    limite = np.inf if np.isnan(dia_diag) else dia_diag

    def fila(anio, g, i, beta, s_i):
        return {
            "anio": round(float(anio), 3),
            "glucosa": round(float(g), 2),
            "insulina": round(float(i), 2),
            "masaBeta": round(float(beta), 3),
            "sensibilidad": round(float(s_i), 3),
            "homaIR": round(float(ic.homa_ir(g, i)), 2),
            "homaBeta": round(float(ic.homa_beta(g, i)), 1),
            "deficitBeta": round(float(ic.deficit_beta(beta)), 1),
        }

    filas = [
        fila(dia / p.DIAS_POR_ANIO, ev.glucosa[k, m], ev.insulina[k, m], ev.masa_beta[k, m], ev.sensibilidad[k, m])
        for k, dia in enumerate(ev.dias_registro)
        if 0 < dia < limite
    ]
    if not np.isnan(dia_diag):
        k_final = len(ev.dias_registro) - 1
        filas.append(fila(dia_diag / p.DIAS_POR_ANIO, ev.glucosa_diagnostico[m], ev.insulina[k_final, m],
                          ev.masa_beta[k_final, m], ev.sensibilidad[k_final, m]))
    return filas


def pre_diagnostico(ev: Evolucion) -> list[dict]:
    indices = np.flatnonzero(ev.diagnosticados)
    if len(indices) < MIN_DIAGNOSTICADOS_PRE:
        return []
    dias_diag = ev.dias_diagnostico[indices]
    ultimo = np.searchsorted(ev.dias_registro, dias_diag, side="left") - 1

    puntos = [{"anio": 0.0, "glucosa": _banda(ev.glucosa_diagnostico[indices]), "n": len(indices)}]
    for j in range(1, MAX_TRIMESTRES_PRE + 1):
        k = ultimo - (j - 1)
        validos = k >= 0
        if validos.sum() < MIN_DIAGNOSTICADOS_PRE:
            break
        valores = ev.glucosa[k[validos], indices[validos]]
        antes = (dias_diag[validos] - ev.dias_registro[k[validos]]) / p.DIAS_POR_ANIO
        puntos.append({"anio": round(-float(np.median(antes)), 3), "glucosa": _banda(valores), "n": int(validos.sum())})
    return puntos[::-1]


def resumir(ev: Evolucion, horizonte_anios: int, edad: int) -> dict:
    n = ev.glucosa.shape[1]
    anios_diag = ev.dias_diagnostico / p.DIAS_POR_ANIO
    diagnosticados = ev.diagnosticados

    def probabilidad(anios: float) -> float:
        return round(float((anios_diag <= anios).sum() / n * 100), 1)

    prob_horizonte = probabilidad(horizonte_anios)
    mediano = float(np.nanmedian(anios_diag)) if diagnosticados.mean() >= 0.5 else None
    serie = serie_trimestral(ev)
    etapa_final = max(serie[-1]["etapaPct"], key=serie[-1]["etapaPct"].get)

    return {
        "serie": serie,
        "trayectoriaEjemplo": trayectoria_ejemplo(ev),
        "preDiagnostico": pre_diagnostico(ev),
        "tiemposDiagnostico": [round(float(t), 2) for t in anios_diag[diagnosticados]],
        "prob5": probabilidad(min(5, horizonte_anios)),
        "probHorizonte": prob_horizonte,
        "etapaMediana": etapa_final,
        "tiempoMedianoDiagnostico": None if mediano is None else round(mediano, 2),
        "edadMedianaDiagnostico": None if mediano is None else round(edad + mediano, 1),
        "tiempoLibreAnios": horizonte_anios if mediano is None else round(mediano, 2),
        "sinDiabetesEnHorizonte": mediano is None,
    }
