"""Informe 3.3.1 · Módulo parametros.py: constantes fisiológicas y parámetros de diseño."""

DIAS_POR_ANIO = 365
DIAS_POR_MES = 30
PASOS_POR_DIA = 5
PASO_EN_DIAS = 1.0 / PASOS_POR_DIA
DT = PASO_EN_DIAS / DIAS_POR_MES
DIAS_POR_TRIMESTRE_ANIO = DIAS_POR_ANIO / 4
EDAD_MAXIMA = 95.0

G_IDEAL = 90.0
I_IDEAL = 10.0
BETA_0 = 1000.0
R_1 = 0.001
D_0 = -0.05
E_G0_BASE = 1.4
SIGMA_MAX = 50.0
ALPHA = 300.0
V_I = 12.0
Y_DMT2 = 126.0

K_VAT_BASE = 0.015
S_I_BASE = 1.8
IMC_REFERENCIA = 22.0
S_I_PENDIENTE_IMC = 0.05
S_I_MINIMA_INICIAL = 0.5

SEDENTARISMO = ("activo", "moderado", "severo")

PERFIL_SEDENTARISMO = {
    "activo": {"factor_base": 0.15, "impacto_imc": 0.05, "riesgo_vida": (0.5, 0.7)},
    "moderado": {"factor_base": 0.60, "impacto_imc": 0.10, "riesgo_vida": (0.9, 1.1)},
    "severo": {"factor_base": 1.20, "impacto_imc": 0.18, "riesgo_vida": (1.4, 1.8)},
}

P_GEN = 0.35
A_GEN_RANGO = (1.2, 1.6)
WEIBULL_KAPPA = 2.5
X_T_MAXIMO = 2.0
RUIDO_METABOLICO_MU = 1.0
RUIDO_METABOLICO_SIGMA = 0.05
GAMMA_FORMA = 2.0
GAMMA_ESCALA = 0.5

UMBRALES_GLUCOTOXICIDAD = (105.0, 115.0, 126.0)
MULTIPLICADORES_GLUCOTOXICIDAD = (1.5, 3.0, 10.0)

LIMITE_DG = 3.5
LIMITE_DI = 5.0
S_I_MINIMA = 0.05
I_MINIMA = 1.0
G_MINIMA = 60.0

G_PREDIABETES = 100.0
HOMA_IR_RESISTENCIA = 2.5

PERCENTILES = (10, 50, 90)
