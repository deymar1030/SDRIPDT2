"""Informe 3.3.1 · Módulo paciente.py (clase PacienteVirtual): perfil clínico, S_I0 y tasa de desgaste adiposo k_VAT."""
from dataclasses import dataclass

import numpy as np

from . import parametros as p
from . import variables_aleatorias as va


@dataclass
class PerfilClinico:
    edad: int
    imc: float
    sedentarismo: str
    antecedente_familiar: bool | None


@dataclass
class PacientesVirtuales:
    perfil: PerfilClinico
    s_i0: float
    k_vat: float
    u_riesgo_vida: np.ndarray
    riesgo_vida: np.ndarray
    a_gen: np.ndarray
    envejecimiento: np.ndarray

    @property
    def n(self) -> int:
        return self.u_riesgo_vida.shape[0]


def sensibilidad_inicial(imc: float) -> float:
    return max(p.S_I_MINIMA_INICIAL, p.S_I_BASE - (imc - p.IMC_REFERENCIA) * p.S_I_PENDIENTE_IMC)


def tasa_desgaste_adiposo(sedentarismo: str, imc: float) -> float:
    perfil = p.PERFIL_SEDENTARISMO[sedentarismo]
    exceso_imc = max(0.0, imc - p.IMC_REFERENCIA)
    return p.K_VAT_BASE * perfil["factor_base"] * (1.0 + exceso_imc * perfil["impacto_imc"])


def riesgo_estilo_vida(sedentarismo: str, u: np.ndarray) -> np.ndarray:
    return va.escalar_uniforme(u, p.PERFIL_SEDENTARISMO[sedentarismo]["riesgo_vida"])


def crear_pacientes(perfil: PerfilClinico, n: int, rng: np.random.Generator) -> PacientesVirtuales:
    if perfil.antecedente_familiar is None:
        antecedentes = va.herencia_bernoulli(rng, n)
    else:
        antecedentes = np.full(n, bool(perfil.antecedente_familiar))

    u_riesgo = va.uniforme(rng, n)
    u_gen = va.uniforme(rng, n)
    a_gen = np.where(antecedentes, va.escalar_uniforme(u_gen, p.A_GEN_RANGO), 1.0)

    return PacientesVirtuales(
        perfil=perfil,
        s_i0=sensibilidad_inicial(perfil.imc),
        k_vat=tasa_desgaste_adiposo(perfil.sedentarismo, perfil.imc),
        u_riesgo_vida=u_riesgo,
        riesgo_vida=riesgo_estilo_vida(perfil.sedentarismo, u_riesgo),
        a_gen=a_gen,
        envejecimiento=va.envejecimiento_weibull(rng, n),
    )
