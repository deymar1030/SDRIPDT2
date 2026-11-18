"""Informe 3.3.1 · Módulo simulador.py (clase SimuladorClinico): integración de Euler y condición de parada (Ecuación 6)."""
from dataclasses import dataclass
from typing import Sequence

import numpy as np

from . import ecuaciones as ec
from . import parametros as p
from . import variables_aleatorias as va
from .escenarios import CambioEstiloVida
from .paciente import PacientesVirtuales, riesgo_estilo_vida, tasa_desgaste_adiposo


@dataclass
class Evolucion:
    dias_registro: np.ndarray
    glucosa: np.ndarray
    insulina: np.ndarray
    masa_beta: np.ndarray
    sensibilidad: np.ndarray
    dias_diagnostico: np.ndarray
    glucosa_diagnostico: np.ndarray

    @property
    def diagnosticados(self) -> np.ndarray:
        return ~np.isnan(self.dias_diagnostico)


def dias_de_registro(horizonte_anios: int) -> np.ndarray:
    trimestres = np.arange(horizonte_anios * 4 + 1)
    return np.round(trimestres * p.DIAS_POR_TRIMESTRE_ANIO).astype(int)


class SimuladorClinico:
    def __init__(self, pacientes: PacientesVirtuales, rng: np.random.Generator, cambios: Sequence[CambioEstiloVida | None] = (None,)):
        self.pacientes = pacientes
        self.rng = rng
        self.cambios = list(cambios)

    def proyectar_evolucion(self, horizonte_anios: int) -> list[Evolucion]:
        pac = self.pacientes
        n_escenarios, n = len(self.cambios), pac.n
        forma = (n_escenarios, n)
        dias = dias_de_registro(horizonte_anios)
        r_0, k_i, r_2 = ec.balance_homeostatico(pac.s_i0)

        g = np.full(forma, p.G_IDEAL)
        i = np.full(forma, p.I_IDEAL)
        beta = np.full(forma, p.BETA_0)
        s_i = np.full(forma, pac.s_i0)

        k_vat = np.full((n_escenarios, 1), pac.k_vat)
        riesgo_vida = np.tile(pac.riesgo_vida, (n_escenarios, 1))
        cambios_por_paso: dict[int, list[int]] = {}
        for s, cambio in enumerate(self.cambios):
            if cambio is not None:
                cambios_por_paso.setdefault(cambio.inicio_dias * p.PASOS_POR_DIA, []).append(s)

        total_pasos = max(p.EDAD_MAXIMA - pac.perfil.edad, 5.0) * p.DIAS_POR_ANIO * p.PASOS_POR_DIA
        edad_frac = pac.perfil.edad / 100.0

        historial = {nombre: np.empty((len(dias), *forma)) for nombre in ("g", "i", "beta", "s_i")}
        dias_diagnostico = np.full(forma, np.nan)
        instantanea = {"g": g.copy(), "i": i.copy(), "beta": beta.copy(), "s_i": s_i.copy()}
        diagnosticado = np.zeros(forma, dtype=bool)

        def registrar(k: int) -> None:
            historial["g"][k] = np.where(diagnosticado, instantanea["g"], g)
            historial["i"][k] = np.where(diagnosticado, instantanea["i"], i)
            historial["beta"][k] = np.where(diagnosticado, instantanea["beta"], beta)
            historial["s_i"][k] = np.where(diagnosticado, instantanea["s_i"], s_i)

        registrar(0)
        paso = 0
        for tramo in range(len(dias) - 1):
            pasos_tramo = int(dias[tramo + 1] - dias[tramo]) * p.PASOS_POR_DIA
            weibull = va.envejecimiento_weibull(self.rng, (pasos_tramo, n))
            ruido = va.fluctuacion_metabolica_normal(self.rng, (pasos_tramo, n))
            t_beta = va.variabilidad_apoptosis_gamma(self.rng, (pasos_tramo, n))

            for j in range(pasos_tramo):
                for s in cambios_por_paso.get(paso, ()):
                    cambio = self.cambios[s]
                    k_vat[s, 0] = tasa_desgaste_adiposo(cambio.sedentarismo, cambio.imc)
                    riesgo_vida[s] = riesgo_estilo_vida(cambio.sedentarismo, pac.u_riesgo_vida)

                x_t = ec.factor_envejecimiento_x_t(weibull[j], paso / total_pasos + edad_frac, riesgo_vida)
                d_si = ec.ecuacion_1_sensibilidad(k_vat, ruido[j], s_i, x_t)
                multiplicador = ec.ecuacion_2_glucotoxicidad(g, pac.a_gen, t_beta[j])
                d_beta = ec.ecuacion_3_masa_beta(beta, g, r_2, multiplicador)
                d_i = np.fmin(np.fmax(ec.ecuacion_4_insulina(beta, i, g, k_i), -p.LIMITE_DI), p.LIMITE_DI)
                d_g = np.fmin(np.fmax(ec.ecuacion_5_glucosa(s_i, i, g, r_0), -p.LIMITE_DG), p.LIMITE_DG)

                s_i = np.maximum(s_i + p.DT * d_si, p.S_I_MINIMA)
                beta = np.maximum(beta + p.DT * d_beta, 0.0)
                i = np.maximum(i + p.DT * d_i, p.I_MINIMA)
                g = np.maximum(g + p.DT * d_g, p.G_MINIMA)
                paso += 1

                nuevos = ~diagnosticado & (g >= p.Y_DMT2)
                if nuevos.any():
                    dias_diagnostico[nuevos] = paso / p.PASOS_POR_DIA
                    for nombre, valor in (("g", g), ("i", i), ("beta", beta), ("s_i", s_i)):
                        instantanea[nombre][nuevos] = valor[nuevos]
                    diagnosticado |= nuevos

            registrar(tramo + 1)
            if diagnosticado.all():
                for k in range(tramo + 2, len(dias)):
                    registrar(k)
                break

        return [
            Evolucion(
                dias_registro=dias,
                glucosa=historial["g"][:, s],
                insulina=historial["i"][:, s],
                masa_beta=historial["beta"][:, s],
                sensibilidad=historial["s_i"][:, s],
                dias_diagnostico=dias_diagnostico[s],
                glucosa_diagnostico=instantanea["g"][s],
            )
            for s in range(n_escenarios)
        ]
