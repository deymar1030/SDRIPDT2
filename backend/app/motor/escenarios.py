"""Informe 3.4.1 · Diseño de escenarios: cambios de estilo de vida comparados sobre el mismo paciente."""
from dataclasses import dataclass

from . import parametros as p
from .paciente import PerfilClinico

FACTOR_IMC = {"moderada": 0.965, "intensiva": 0.93}


@dataclass(frozen=True)
class CambioEstiloVida:
    sedentarismo: str
    imc: float
    inicio_dias: int


def _mejorar_un_nivel(sedentarismo: str) -> str:
    indice = p.SEDENTARISMO.index(sedentarismo)
    return p.SEDENTARISMO[max(0, indice - 1)]


def _imc_reducido(imc: float, factor: float) -> float:
    return round(min(imc, max(p.IMC_REFERENCIA, imc * factor)), 1)


def resolver_cambio(nivel: str, parametros: dict | None, perfil: PerfilClinico) -> CambioEstiloVida | None:
    if nivel == "moderada":
        return CambioEstiloVida(_mejorar_un_nivel(perfil.sedentarismo), _imc_reducido(perfil.imc, FACTOR_IMC["moderada"]), 0)
    if nivel == "intensiva":
        return CambioEstiloVida("activo", _imc_reducido(perfil.imc, FACTOR_IMC["intensiva"]), 0)
    if nivel == "personalizada" and parametros:
        return CambioEstiloVida(
            parametros.get("sedentarismo") or perfil.sedentarismo,
            float(parametros.get("imc_objetivo") or perfil.imc),
            int(parametros.get("inicio_anio") or 0) * p.DIAS_POR_ANIO,
        )
    return None


def describir_cambio(cambio: CambioEstiloVida | None, perfil: PerfilClinico) -> dict:
    if cambio is None:
        return {"sedentarismo": perfil.sedentarismo, "imc": perfil.imc, "inicioAnio": 0, "cambia": False}
    return {
        "sedentarismo": cambio.sedentarismo,
        "imc": cambio.imc,
        "inicioAnio": round(cambio.inicio_dias / p.DIAS_POR_ANIO, 2),
        "cambia": True,
    }
