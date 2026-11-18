"""Informe 3.2.1 · Variables de entrada (aleatorias): Weibull, Normal, Gamma, Bernoulli y Uniforme."""
import numpy as np

from . import parametros as p


def envejecimiento_weibull(rng: np.random.Generator, size) -> np.ndarray:
    return rng.weibull(p.WEIBULL_KAPPA, size)


def fluctuacion_metabolica_normal(rng: np.random.Generator, size) -> np.ndarray:
    return rng.normal(p.RUIDO_METABOLICO_MU, p.RUIDO_METABOLICO_SIGMA, size)


def variabilidad_apoptosis_gamma(rng: np.random.Generator, size) -> np.ndarray:
    return rng.gamma(p.GAMMA_FORMA, p.GAMMA_ESCALA, size)


def herencia_bernoulli(rng: np.random.Generator, size) -> np.ndarray:
    return rng.binomial(1, p.P_GEN, size).astype(bool)


def uniforme(rng: np.random.Generator, size) -> np.ndarray:
    return rng.random(size)


def escalar_uniforme(u: np.ndarray, rango: tuple[float, float]) -> np.ndarray:
    bajo, alto = rango
    return bajo + u * (alto - bajo)
