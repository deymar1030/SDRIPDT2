"""Informe 3.4.2 · Índices clínicos de salida: HOMA-IR, HOMA-β, déficit beta y etapa clínica."""
import numpy as np

from . import parametros as p


def homa_ir(glucosa, insulina):
    return glucosa * insulina / 405.0


def homa_beta(glucosa, insulina):
    return 360.0 * insulina / np.maximum(glucosa - 63.0, 1.0)


def deficit_beta(masa_beta):
    return (1.0 - masa_beta / p.BETA_0) * 100.0


def masa_beta_pct(masa_beta):
    return masa_beta / p.BETA_0 * 100.0


def clasificar_etapa_clinica(glucosa: float, homa_ir_valor: float) -> str:
    if glucosa >= p.Y_DMT2:
        return "diabetes"
    if glucosa >= p.G_PREDIABETES:
        return "prediabetes"
    if homa_ir_valor >= p.HOMA_IR_RESISTENCIA:
        return "resistencia"
    return "sano"


def porcentaje_por_etapa(glucosa: np.ndarray, homa_ir_valor: np.ndarray, diagnosticado: np.ndarray) -> dict[str, float]:
    etapa = np.select(
        [diagnosticado | (glucosa >= p.Y_DMT2), glucosa >= p.G_PREDIABETES, homa_ir_valor >= p.HOMA_IR_RESISTENCIA],
        [3, 2, 1],
        default=0,
    )
    nombres = ("sano", "resistencia", "prediabetes", "diabetes")
    return {nombre: round(float((etapa == k).mean() * 100), 1) for k, nombre in enumerate(nombres)}
