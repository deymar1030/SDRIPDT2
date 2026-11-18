"""Informe 3.2.2 · Ecuaciones del modelo matemático (Ecuaciones 1 a 5) y balance homeostático inicial."""
import numpy as np

from . import parametros as p

_TABLA_GLUCOTOXICIDAD = np.array((1.0, *p.MULTIPLICADORES_GLUCOTOXICIDAD))


def secrecion_sigmoidea(g):
    return p.SIGMA_MAX * g ** 2 / (p.ALPHA ** 2 + g ** 2)


def balance_homeostatico(s_i0: float) -> tuple[float, float, float]:
    g, i = p.G_IDEAL, p.I_IDEAL
    r_0 = p.E_G0_BASE * g + s_i0 * i * g
    k_i = ((p.BETA_0 * secrecion_sigmoidea(g)) / p.V_I) / i
    r_2 = (p.D_0 + p.R_1 * g) / (g ** 2)
    return r_0, k_i, r_2


def factor_envejecimiento_x_t(weibull, tiempo_frac: float, riesgo_vida):
    return np.minimum(weibull * tiempo_frac * riesgo_vida, p.X_T_MAXIMO)


def ecuacion_1_sensibilidad(k_vat, ruido_metabolico, s_i, x_t):
    return -(k_vat * ruido_metabolico * s_i * x_t)


def ecuacion_2_glucotoxicidad(g, a_gen, t_beta):
    umbral_1, umbral_2, umbral_3 = p.UMBRALES_GLUCOTOXICIDAD
    nivel = (g > umbral_1).astype(np.intp) + (g > umbral_2) + (g >= umbral_3)
    return _TABLA_GLUCOTOXICIDAD[nivel] * np.where(nivel > 0, a_gen, 1.0) * t_beta


def ecuacion_3_masa_beta(beta, g, r_2, multiplicador):
    return beta * (p.D_0 + p.R_1 * g - r_2 * multiplicador * g ** 2)


def ecuacion_4_insulina(beta, i, g, k_i):
    return (beta * secrecion_sigmoidea(g)) / p.V_I - k_i * i


def ecuacion_5_glucosa(s_i, i, g, r_0):
    return r_0 - p.E_G0_BASE * g - s_i * i * g
