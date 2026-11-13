"""Clasificación clínica y motor de simulación (sin pasar por la API)."""

import math

import numpy as np
import pytest

from app.clinical import calcular_homa_ir, clasificar_etapa_clinica
from app.engine import (
    C_BETA_DIABETES, D_INS_BASAL, G_BASAL, I_SEC_MAX, K5, MARGEN_C_BETA, PISO_C_BETA,
    estado_inicial_completo, estimar_estado_inicial, simular_paciente,
)
from app.intervencion import peso_del_paciente, resolver_intervencion


# ----------------------------------------------------------------- clasificación clínica
def test_homa_ir_formula():
    assert calcular_homa_ir(108, 15) == 4.0
    assert calcular_homa_ir(90, 9) == 2.0


@pytest.mark.parametrize(
    "glucosa, hba1c, homa, esperada",
    [
        (99, 5.0, 1.0, "sano"),
        (100, 5.0, 1.0, "prediabetes"),       # umbral de glucosa
        (125, 5.0, 1.0, "prediabetes"),
        (126, 5.0, 1.0, "diabetes"),          # umbral de glucosa
        (90, 5.7, 1.0, "prediabetes"),        # umbral de HbA1c
        (90, 6.4, 1.0, "prediabetes"),
        (90, 6.5, 1.0, "diabetes"),           # umbral de HbA1c
        (90, None, 2.5, "resistencia"),       # umbral de HOMA-IR
        (90, None, 2.49, "sano"),
        (130, 5.0, 9.0, "diabetes"),          # la etapa más grave manda
    ],
)
def test_etapa_clinica_umbrales(glucosa, hba1c, homa, esperada):
    assert clasificar_etapa_clinica(glucosa, hba1c, homa) == esperada


# ----------------------------------------------------------------- estado inicial
def test_estado_inicial_reproduce_glucosa_e_insulina_medidas():
    """El estado oculto estimado debe devolver, con las fórmulas del modelo, la
    glucosa y la insulina que se midieron (Rosa: glucosa 108, insulina 15)."""
    s_i, c_beta, _ = estimar_estado_inicial(108, 15, 30.9)
    d_ins = D_INS_BASAL / s_i
    i_sec = min(d_ins, c_beta / 100 * I_SEC_MAX)
    glucosa = G_BASAL + max(0.0, d_ins - i_sec) * K5
    assert glucosa == pytest.approx(108, abs=0.5)
    assert i_sec == pytest.approx(15, abs=0.5)


def test_estado_inicial_sin_deficit_asume_reserva_sana():
    _, c_beta, _ = estimar_estado_inicial(85, 6, 24)
    assert c_beta == 100.0


@pytest.mark.parametrize("etapa, glucosa, insulina, hba1c", [
    ("sano", 85, 6, 5.1), ("prediabetes", 108, 15, 5.9), ("diabetes", 131, 19, 6.6),
])
def test_piso_de_reserva_por_etapa(etapa, glucosa, insulina, hba1c):
    e = estado_inicial_completo(glucosa, insulina, 28, hba1c)
    assert e["etapa"] == etapa
    assert e["cBeta0"] >= PISO_C_BETA[etapa]
    assert e["cBeta0"] > C_BETA_DIABETES or etapa == "diabetes"   # nadie que hoy no es diabético arranca "ya diabético" por reserva


# ----------------------------------------------------------------- motor
def _simular(**cambios):
    base = dict(edad=46, imc=27, glucosa=93, insulina=9, hba1c=5.4, antecedente_familiar=False,
                nivel_intervencion="nula", horizonte_anios=6, trayectorias=100, semilla=11)
    base.update(cambios)
    return simular_paciente(**base)


def test_motor_estructura_y_semana_cero_con_laboratorios_reales():
    r = _simular(glucosa=108, insulina=15, hba1c=5.9, imc=31)
    anual = r["resumenAnual"]
    assert [p["anio"] for p in anual] == list(range(7))
    assert anual[0]["glucosa"]["p50"] == 108          # el año 0 muestra el laboratorio real, no una recomputación
    assert anual[0]["insulina"]["p50"] == 15
    assert set(r) >= {"prob5", "probHorizonte", "etapaMediana", "edadMedianaInflexion", "estadoInicial"}


@pytest.mark.parametrize("nivel", ["nula", "moderada", "intensiva"])
def test_motor_invariantes_de_las_bandas(nivel):
    r = _simular(nivel_intervencion=nivel, glucosa=104, insulina=13, hba1c=5.8, imc=29)
    for p in r["resumenAnual"]:
        for marcador in ("glucosa", "insulina", "homaIR", "reserva", "sensibilidad", "adiposo"):
            b = p[marcador]
            assert all(math.isfinite(v) for v in b.values()), (p["anio"], marcador)
            assert b["p10"] <= b["p50"] <= b["p90"], (p["anio"], marcador, b)
        assert 0 <= p["reserva"]["p10"] and p["reserva"]["p90"] <= 100
        assert p["adiposo"]["p10"] >= 0
        assert sum(p["etapaPct"].values()) == pytest.approx(100, abs=0.6)
    assert 0 <= r["prob5"] <= r["probHorizonte"] <= 100


def test_motor_es_reproducible_con_semilla():
    assert _simular(semilla=5)["resumenAnual"] == _simular(semilla=5)["resumenAnual"]


def test_motor_paciente_sano_joven_no_progresa():
    for nivel in ("nula", "moderada", "intensiva"):
        r = _simular(edad=28, imc=22.5, glucosa=82, insulina=5, hba1c=5.0, nivel_intervencion=nivel)
        assert r["prob5"] == 0 and r["probHorizonte"] == 0, nivel


def test_motor_paciente_ya_diabetico_arranca_en_diabetes():
    r = _simular(glucosa=131, insulina=19, hba1c=6.6, imc=34, edad=60)
    assert r["resumenAnual"][0]["etapaPct"]["diabetes"] == 100
    assert r["prob5"] == 100


def test_la_intervencion_no_empeora_el_pronostico():
    kwargs = dict(edad=35, imc=26.5, glucosa=88, insulina=8, hba1c=5.2, antecedente_familiar=None, trayectorias=200)
    p = {n: _simular(nivel_intervencion=n, **kwargs)["prob5"] for n in ("nula", "moderada", "intensiva")}
    assert p["intensiva"] <= p["moderada"] <= p["nula"], p


# Paciente en riesgo (prediabetes con obesidad y antecedente familiar) para probar la ventana de la intervención.
RIESGO = dict(edad=55, imc=33.0, glucosa=112, insulina=18, hba1c=6.0, antecedente_familiar=True, horizonte_anios=10, trayectorias=300)
PLAN = {"reduccion_kcal_dia": 500, "ejercicio_dias": 5, "ejercicio_minutos": 45, "ejercicio_intensidad": "moderada"}


def _con_plan(**cambios):
    peso, est = peso_del_paciente(None, RIESGO["imc"])
    iv = resolver_intervencion("personalizada", {**PLAN, **cambios}, peso, est)
    return _simular(**{**RIESGO, "intervencion": iv})


def test_ventana_de_intervencion_empezar_tarde_empeora():
    hoy, tarde = _con_plan(), _con_plan(inicio_anio=3)
    assert tarde["probHorizonte"] > hoy["probHorizonte"]
    assert tarde["prob5"] > hoy["prob5"]


def test_dejar_la_intervencion_a_los_2_anios_empeora_frente_a_mantenerla():
    siempre, dos_anios = _con_plan(), _con_plan(duracion_anios=2)
    assert dos_anios["probHorizonte"] > siempre["probHorizonte"]


def test_peso_baja_y_se_estabiliza_con_la_intervencion_y_se_recupera_al_dejarla():
    """Adaptación metabólica: la grasa baja unos kg y se estabiliza (no cae sin límite);
    si se abandona el plan, vuelve hacia su nivel de partida."""
    siempre, dos_anios = _con_plan(), _con_plan(duracion_anios=2)
    grasa = lambda r, a: r["resumenAnual"][a]["adiposo"]["p50"]
    inicial = grasa(siempre, 0)
    assert 3 <= inicial - grasa(siempre, 2) <= 12                  # baja unos kg…
    assert abs(grasa(siempre, 6) - grasa(siempre, 2)) < 2          # …y se estabiliza
    assert grasa(siempre, 6) > 0                                    # no llega a "cero grasa"
    assert inicial - grasa(dos_anios, 5) < 2                        # al dejarlo, recupera


def test_sin_cambios_el_peso_no_se_mueve():
    r = _simular(**{**RIESGO, "nivel_intervencion": "nula"})
    assert abs(r["resumenAnual"][10]["adiposo"]["p50"] - r["resumenAnual"][0]["adiposo"]["p50"]) < 1.5


# --------------------------------------------- calibración contra rangos de la literatura
# (órdenes de magnitud: Diabetes Prevention Program, ADA; ver backend/calibracion/calibrar.py)
# caso: (edad, imc, glucosa, insulina, hba1c, familiar, rango prob. a 5 años sin cambios)
CASOS_CALIBRACION = {
    "sano joven":         (28, 22.5, 82, 5, 5.0, False, (0, 3)),
    "sano con sobrepeso": (35, 26.5, 88, 8, 5.2, None, (0, 9)),
    "resistencia leve":   (41, 28.9, 92, 12, 5.4, True, (6, 24)),
    "resistencia marcada": (47, 31.0, 96, 17, 5.5, True, (12, 38)),
    "prediabetes inicial": (52, 29.5, 103, 14, 5.8, None, (20, 45)),
    "prediabetes y obesidad": (55, 33.0, 112, 18, 6.0, True, (30, 62)),
    "prediabetes alta":   (58, 30.0, 118, 16, 6.3, False, (40, 72)),
    "IFG con insulina baja": (57, 29.7, 100, 10, 5.6, False, (12, 48)),
    "IFG con insulina muy baja": (50, 25.0, 105, 7, 5.7, None, (15, 52)),
    "resistencia sin glucosa alta": (45, 30.0, 94, 14, 5.5, None, (5, 26)),
}
PLANTILLAS_MODAL = {
    "moderada": {"reduccion_kcal_dia": 300, "ejercicio_dias": 5, "ejercicio_minutos": 30, "ejercicio_intensidad": "ligera"},
    "intensiva": {"reduccion_kcal_dia": 500, "ejercicio_dias": 5, "ejercicio_minutos": 45, "ejercicio_intensidad": "moderada"},
}


def _prob5(caso, plantilla=None):
    edad, imc, g, i, a1c, fam, _ = CASOS_CALIBRACION[caso]
    peso, est = peso_del_paciente(None, imc)
    iv = resolver_intervencion("personalizada", PLANTILLAS_MODAL[plantilla], peso, est) if plantilla else resolver_intervencion("nula", None, peso, est)
    return simular_paciente(edad=edad, imc=imc, glucosa=g, insulina=i, hba1c=a1c, antecedente_familiar=fam, horizonte_anios=5,
                            trayectorias=400, semilla=2024, intervencion=iv)["prob5"]


@pytest.mark.parametrize("caso", list(CASOS_CALIBRACION))
def test_calibracion_incidencia_a_5_anios_dentro_del_rango_publicado(caso):
    lo, hi = CASOS_CALIBRACION[caso][-1]
    assert lo - 4 <= _prob5(caso) <= hi + 4          # margen de 4 puntos por el azar de la simulación


@pytest.mark.parametrize("caso", ["prediabetes inicial", "prediabetes y obesidad", "prediabetes alta"])
def test_calibracion_la_intervencion_reduce_el_riesgo_en_la_magnitud_publicada(caso):
    """Estilo de vida intensivo ≈ −58 % (DPP); moderado, algo menos. Margen amplio: son órdenes de magnitud."""
    nula, moderada, intensiva = _prob5(caso), _prob5(caso, "moderada"), _prob5(caso, "intensiva")
    assert intensiva <= moderada <= nula
    assert 0.25 <= moderada / nula <= 0.9
    assert 0.20 <= intensiva / nula <= 0.65


def test_calibracion_persona_con_laboratorio_normal_no_se_diabetiza_sin_motivo():
    r = _simular(edad=35, imc=26.5, glucosa=88, insulina=8, hba1c=5.2, antecedente_familiar=None, trayectorias=200)
    assert r["prob5"] < 50


def test_calibracion_la_respuesta_es_gradual_entre_escenarios():
    kwargs = dict(edad=47, imc=31, glucosa=96, insulina=17, hba1c=5.5, antecedente_familiar=True, trayectorias=300)
    valores = [_simular(nivel_intervencion=n, **kwargs)["prob5"] for n in ("nula", "moderada", "intensiva")]
    assert any(10 <= v <= 90 for v in valores), valores


# --------------------------------------------- robustez de la calibración
def test_el_riesgo_sube_con_la_glucosa_sin_saltos_absurdos():
    """Barrido de glucosa (insulina 12, IMC 29): el riesgo a 5 años debe crecer de forma coherente."""
    def prob(g):
        return simular_paciente(edad=50, imc=29.0, glucosa=g, insulina=12, hba1c=5.6, antecedente_familiar=None,
                                horizonte_anios=5, trayectorias=300, semilla=9)["prob5"]
    valores = [prob(g) for g in (86, 92, 98, 104, 110, 116, 122)]
    assert all(b >= a - 3 for a, b in zip(valores, valores[1:])), valores     # monótono (3 puntos de margen por azar)
    assert valores[0] <= 3 and valores[-1] >= 45, valores


@pytest.mark.parametrize("insulina", [4, 7, 10, 14, 20, 28])
def test_quien_no_es_diabetico_no_arranca_pegado_al_umbral_de_diabetes(insulina):
    """Con glucosa 104 y cualquier insulina, la reserva inicial queda por encima del umbral más un margen
    (antes, con insulina baja, la estimación caía casi al umbral y el paciente salía con ~100 % de riesgo)."""
    e = estado_inicial_completo(104, insulina, 29.0, 5.6)
    assert e["etapa"] == "prediabetes"
    assert e["cBeta0"] >= C_BETA_DIABETES + MARGEN_C_BETA
    r = simular_paciente(edad=50, imc=29.0, glucosa=104, insulina=insulina, hba1c=5.6, antecedente_familiar=None,
                         horizonte_anios=5, trayectorias=300, semilla=4)
    assert r["prob5"] < 75
