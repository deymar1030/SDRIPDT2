"""Motor de simulación estocástica de la progresión a diabetes tipo 2 (modelo de Topp et al. del informe).

Informe → archivo:
  3.2.1 Variables aleatorias ........ variables_aleatorias.py
  3.2.1 Parámetros y constantes ..... parametros.py
  3.2.2 Ecuaciones 1 a 5 ............ ecuaciones.py
  3.3.1 PacienteVirtual ............. paciente.py
  3.3.1 SimuladorClinico y Ec. 6 .... simulador.py
  3.4.1 Escenarios .................. escenarios.py
  3.4.2 Índices clínicos ............ indices_clinicos.py
  3.4.2 y 3.4.3 Gráficos de salida ... resultados.py
"""
from typing import Sequence

import numpy as np

from . import parametros as p
from .escenarios import CambioEstiloVida, describir_cambio
from .paciente import PerfilClinico, crear_pacientes, sensibilidad_inicial, tasa_desgaste_adiposo
from .resultados import resumir
from .simulador import SimuladorClinico


def simular_escenarios(
    edad: int,
    imc: float,
    sedentarismo: str,
    antecedente_familiar: bool | None,
    horizonte_anios: int,
    trayectorias: int,
    cambios: Sequence[CambioEstiloVida | None],
    semilla: int | None = None,
) -> list[dict]:
    rng = np.random.default_rng(semilla)
    perfil = PerfilClinico(edad, imc, sedentarismo, antecedente_familiar)
    pacientes = crear_pacientes(perfil, trayectorias, rng)
    evoluciones = SimuladorClinico(pacientes, rng, cambios).proyectar_evolucion(horizonte_anios)
    estado_inicial = {
        "sI0": round(pacientes.s_i0, 3),
        "kVat": round(pacientes.k_vat, 5),
        "riesgoVida": round(float(pacientes.riesgo_vida.mean()), 3),
        "aGen": round(float(pacientes.a_gen.mean()), 3),
    }
    salidas = []
    for evolucion, cambio in zip(evoluciones, cambios):
        salida = resumir(evolucion, horizonte_anios, edad)
        salida["estadoInicial"] = estado_inicial
        salida["intervencion"] = describir_cambio(cambio, perfil)
        salidas.append(salida)
    return salidas


def simular_paciente(
    edad: int,
    imc: float,
    sedentarismo: str,
    antecedente_familiar: bool | None,
    horizonte_anios: int,
    trayectorias: int,
    cambio: CambioEstiloVida | None = None,
    semilla: int | None = None,
) -> dict:
    return simular_escenarios(edad, imc, sedentarismo, antecedente_familiar, horizonte_anios, trayectorias, [cambio], semilla)[0]


def calcular_supuestos(edad: int, imc: float, sedentarismo: str, antecedente_familiar: bool | None) -> dict:
    return {
        "variablesAleatorias": [
            {"simbolo": "X_t", "nombre": "Envejecimiento y riesgo", "distribucion": "Weibull",
             "parametros": f"κ = {p.WEIBULL_KAPPA}, tope {p.X_T_MAXIMO}"},
            {"simbolo": "E_cal_ruido", "nombre": "Fluctuación metabólica diaria", "distribucion": "Normal",
             "parametros": f"μ = {p.RUIDO_METABOLICO_MU}, σ = {p.RUIDO_METABOLICO_SIGMA}"},
            {"simbolo": "T_β", "nombre": "Variabilidad de muerte celular", "distribucion": "Gamma",
             "parametros": f"k = {p.GAMMA_FORMA}, θ = {p.GAMMA_ESCALA}"},
            {"simbolo": "P_gen", "nombre": "Factor de riesgo genético", "distribucion": "Bernoulli",
             "parametros": "fijo por el antecedente informado" if antecedente_familiar is not None else f"p = {p.P_GEN}"},
            {"simbolo": "riesgo_vida", "nombre": "Resiliencia de estilo de vida", "distribucion": "Uniforme",
             "parametros": "U" + str(p.PERFIL_SEDENTARISMO[sedentarismo]["riesgo_vida"])},
            {"simbolo": "a_gen", "nombre": "Amplificación genética del daño", "distribucion": "Uniforme",
             "parametros": f"U{p.A_GEN_RANGO} si hay herencia, 1.0 si no"},
        ],
        "parametrosFijos": {
            "E_G0": p.E_G0_BASE, "σ_max": p.SIGMA_MAX, "α": p.ALPHA, "V_I": p.V_I, "d_0": p.D_0, "r_1": p.R_1,
            "β_0": p.BETA_0, "k_VAT base": p.K_VAT_BASE, "Y_DMT2": p.Y_DMT2,
            "pasos por día": float(p.PASOS_POR_DIA), "días por año": float(p.DIAS_POR_ANIO),
        },
        "basalPaciente": {
            "S_I0": round(sensibilidad_inicial(imc), 3),
            "k_VAT": round(tasa_desgaste_adiposo(sedentarismo, imc), 5),
            "G_0": p.G_IDEAL, "I_0": p.I_IDEAL,
        },
    }
