"""Clasificación clínica y motor de simulación (sin pasar por la API)."""

import math

import numpy as np
import pytest

from app.clinical import calcular_homa_ir, clasificar_etapa_clinica
from app.engine import (
    D_INS_BASAL, G_BASAL, I_SEC_MAX, K5, estado_inicial_completo, estimar_estado_inicial, simular_paciente,
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


@pytest.mark.parametrize("etapa, glucosa, insulina, hba1c, piso", [
    ("sano", 85, 6, 5.1, 70), ("prediabetes", 108, 15, 5.9, 35), ("diabetes", 131, 19, 6.6, 0),
])
def test_piso_de_reserva_por_etapa(etapa, glucosa, insulina, hba1c, piso):
    e = estado_inicial_completo(glucosa, insulina, 28, hba1c)
    assert e["etapa"] == etapa
    assert e["cBeta0"] >= piso


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


def test_ventana_de_intervencion_empezar_tarde_empeora():
    peso, est = peso_del_paciente(None, 27)
    parametros = {"reduccion_kcal_dia": 500, "ejercicio_dias": 5, "ejercicio_minutos": 45, "ejercicio_intensidad": "moderada"}
    hoy = resolver_intervencion("personalizada", parametros, peso, est)
    tarde = resolver_intervencion("personalizada", {**parametros, "inicio_anio": 3}, peso, est)
    kwargs = dict(horizonte_anios=8, trayectorias=200)
    r_hoy, r_tarde = _simular(intervencion=hoy, **kwargs), _simular(intervencion=tarde, **kwargs)
    assert r_tarde["prob5"] > r_hoy["prob5"]


def test_dejar_la_intervencion_a_los_2_anios_empeora_frente_a_mantenerla():
    peso, est = peso_del_paciente(None, 27)
    parametros = {"reduccion_kcal_dia": 500, "ejercicio_dias": 5, "ejercicio_minutos": 45, "ejercicio_intensidad": "moderada"}
    siempre = resolver_intervencion("personalizada", parametros, peso, est)
    dos_anios = resolver_intervencion("personalizada", {**parametros, "duracion_anios": 2}, peso, est)
    kwargs = dict(horizonte_anios=10, trayectorias=200)
    assert _simular(intervencion=dos_anios, **kwargs)["probHorizonte"] >= _simular(intervencion=siempre, **kwargs)["probHorizonte"]


# --------------------------------------------- calibración clínica (conocida como pendiente)
@pytest.mark.xfail(reason="Calibración pendiente: pacientes con laboratorio normal salen con ~99 % de diabetes a 5 años", strict=False)
def test_calibracion_persona_con_laboratorio_normal_no_deberia_diabetizarse_sin_motivo():
    r = _simular(edad=35, imc=26.5, glucosa=88, insulina=8, hba1c=5.2, antecedente_familiar=None, trayectorias=200)
    assert r["prob5"] < 50


@pytest.mark.xfail(reason="Calibración pendiente: los resultados son todo-o-nada (0 % / 100 %), sin zona intermedia", strict=False)
def test_calibracion_la_respuesta_debe_ser_gradual_entre_escenarios():
    kwargs = dict(edad=47, imc=31, glucosa=96, insulina=17, hba1c=5.5, antecedente_familiar=True, trayectorias=300)
    valores = [_simular(nivel_intervencion=n, **kwargs)["prob5"] for n in ("nula", "moderada", "intensiva")]
    assert any(10 <= v <= 90 for v in valores), valores
