"""Motor de simulación: una sección de pruebas por archivo del paquete app/motor."""

import math

import numpy as np
import pytest

from app.motor import calcular_supuestos, parametros as p, simular_escenarios, simular_paciente
from app.motor import ecuaciones as ec
from app.motor import indices_clinicos as ic
from app.motor import variables_aleatorias as va
from app.motor.escenarios import CambioEstiloVida, resolver_cambio
from app.motor.paciente import PerfilClinico, calcular_imc, crear_pacientes, sensibilidad_inicial, tasa_desgaste_adiposo

PERSONA_1 = dict(edad=20, imc=19.0, sedentarismo="moderado", antecedente_familiar=False)
PERSONA_2 = dict(edad=40, imc=33.5, sedentarismo="severo", antecedente_familiar=True)
PERSONA_3 = dict(edad=20, imc=25.0, sedentarismo="severo", antecedente_familiar=False)
PERSONA_4 = dict(edad=65, imc=22.0, sedentarismo="activo", antecedente_familiar=False)


# ============================================================== variables_aleatorias.py
def test_las_variables_aleatorias_tienen_la_distribucion_del_informe():
    rng = np.random.default_rng(1)
    n = 200_000
    assert va.envejecimiento_weibull(rng, n).mean() == pytest.approx(math.gamma(1 + 1 / p.WEIBULL_KAPPA), abs=0.01)
    ruido = va.fluctuacion_metabolica_normal(rng, n)
    assert ruido.mean() == pytest.approx(1.0, abs=0.002) and ruido.std() == pytest.approx(0.05, abs=0.002)
    assert va.variabilidad_apoptosis_gamma(rng, n).mean() == pytest.approx(p.GAMMA_FORMA * p.GAMMA_ESCALA, abs=0.01)
    assert va.herencia_bernoulli(rng, n).mean() == pytest.approx(p.P_GEN, abs=0.005)
    u = va.uniforme(rng, n)
    assert 0 <= u.min() and u.max() < 1 and u.mean() == pytest.approx(0.5, abs=0.005)


def test_escalar_uniforme_respeta_el_rango():
    valores = va.escalar_uniforme(np.linspace(0, 1, 11), (1.2, 1.6))
    assert valores.min() == pytest.approx(1.2) and valores.max() == pytest.approx(1.6)


# ============================================================== paciente.py
def test_el_imc_se_calcula_con_peso_y_talla():
    assert calcular_imc(80, 180) == 24.7
    assert calcular_imc(70, 170) == 24.2


def test_sensibilidad_inicial_baja_con_el_imc_y_tiene_piso():
    assert sensibilidad_inicial(22.0) == pytest.approx(1.8)
    assert sensibilidad_inicial(32.0) == pytest.approx(1.3)
    assert sensibilidad_inicial(80.0) == p.S_I_MINIMA_INICIAL


def test_el_desgaste_adiposo_crece_con_el_sedentarismo_y_el_imc():
    assert tasa_desgaste_adiposo("activo", 30) < tasa_desgaste_adiposo("moderado", 30) < tasa_desgaste_adiposo("severo", 30)
    assert tasa_desgaste_adiposo("moderado", 20) < tasa_desgaste_adiposo("moderado", 35)
    assert tasa_desgaste_adiposo("moderado", 22) == pytest.approx(p.K_VAT_BASE * 0.60)


@pytest.mark.parametrize("sedentarismo", p.SEDENTARISMO)
def test_riesgo_de_vida_cae_en_el_rango_de_su_nivel(sedentarismo):
    pacientes = crear_pacientes(PerfilClinico(40, 25, sedentarismo, False), 500, np.random.default_rng(0))
    bajo, alto = p.PERFIL_SEDENTARISMO[sedentarismo]["riesgo_vida"]
    assert bajo <= pacientes.riesgo_vida.min() and pacientes.riesgo_vida.max() <= alto


def test_herencia_fija_o_sorteada_segun_el_antecedente():
    rng = np.random.default_rng(0)
    con = crear_pacientes(PerfilClinico(40, 25, "moderado", True), 300, rng)
    sin = crear_pacientes(PerfilClinico(40, 25, "moderado", False), 300, rng)
    desconocido = crear_pacientes(PerfilClinico(40, 25, "moderado", None), 3000, rng)
    assert (con.a_gen >= 1.2).all() and (con.a_gen <= 1.6).all()
    assert (sin.a_gen == 1.0).all()
    assert (desconocido.a_gen > 1.0).mean() == pytest.approx(p.P_GEN, abs=0.04)


# ============================================================== ecuaciones.py
def test_el_estado_inicial_es_un_equilibrio_homeostatico():
    s_i0 = sensibilidad_inicial(25.0)
    r_0, k_i, r_2 = ec.balance_homeostatico(s_i0)
    g, i, beta = np.array([p.G_IDEAL]), np.array([p.I_IDEAL]), np.array([p.BETA_0])
    assert ec.ecuacion_5_glucosa(s_i0, i, g, r_0) == pytest.approx(0, abs=1e-9)
    assert ec.ecuacion_4_insulina(beta, i, g, k_i) == pytest.approx(0, abs=1e-9)
    assert ec.ecuacion_3_masa_beta(beta, g, r_2, np.array([1.0])) == pytest.approx(0, abs=1e-9)


def test_ecuacion_1_la_sensibilidad_solo_cae():
    assert ec.ecuacion_1_sensibilidad(0.01, 1.0, 1.5, 1.0) < 0
    assert ec.ecuacion_1_sensibilidad(0.01, 1.0, 1.5, 0.0) == 0


@pytest.mark.parametrize("glucosa, esperado", [(100, 1.0), (105, 1.0), (110, 1.5), (115, 1.5), (120, 3.0), (126, 10.0), (200, 10.0)])
def test_ecuacion_2_multiplicador_de_glucotoxicidad(glucosa, esperado):
    resultado = ec.ecuacion_2_glucotoxicidad(np.array([float(glucosa)]), np.array([1.0]), np.array([1.0]))
    assert resultado[0] == pytest.approx(esperado)


def test_ecuacion_2_la_herencia_amplifica_solo_sobre_105():
    t = np.array([1.0])
    assert ec.ecuacion_2_glucotoxicidad(np.array([100.0]), np.array([1.5]), t)[0] == pytest.approx(1.0)
    assert ec.ecuacion_2_glucotoxicidad(np.array([110.0]), np.array([1.5]), t)[0] == pytest.approx(1.5 * 1.5)


def test_el_factor_de_envejecimiento_tiene_tope():
    assert ec.factor_envejecimiento_x_t(np.array([10.0]), 0.9, np.array([1.8]))[0] == p.X_T_MAXIMO


# ============================================================== indices_clinicos.py
def test_indices_clinicos_del_estado_ideal():
    assert ic.homa_ir(90, 10) == pytest.approx(2.222, abs=0.001)
    assert ic.homa_beta(90, 10) == pytest.approx(133.3, abs=0.1)
    assert ic.deficit_beta(1000) == 0 and ic.deficit_beta(400) == pytest.approx(60)


@pytest.mark.parametrize("glucosa, homa, etapa", [(85, 1.5, "sano"), (92, 3.0, "resistencia"), (108, 2.0, "prediabetes"), (126, 2.0, "diabetes")])
def test_clasificacion_de_etapa(glucosa, homa, etapa):
    assert ic.clasificar_etapa_clinica(glucosa, homa) == etapa


# ============================================================== escenarios.py
def test_escenarios_predefinidos_y_personalizado():
    perfil = PerfilClinico(40, 33.5, "severo", True)
    assert resolver_cambio("nula", None, perfil) is None
    moderada = resolver_cambio("moderada", None, perfil)
    assert moderada.sedentarismo == "moderado" and moderada.imc < 33.5 and moderada.inicio_dias == 0
    intensiva = resolver_cambio("intensiva", None, perfil)
    assert intensiva.sedentarismo == "activo" and intensiva.imc < moderada.imc
    personal = resolver_cambio("personalizada", {"sedentarismo": "activo", "imc_objetivo": None, "inicio_anio": 2}, perfil)
    assert personal == CambioEstiloVida("activo", 33.5, 2 * p.DIAS_POR_ANIO)


def test_las_intervenciones_no_empeoran_a_quien_ya_esta_bien():
    perfil = PerfilClinico(30, 21.0, "activo", False)
    assert resolver_cambio("moderada", None, perfil).sedentarismo == "activo"
    assert resolver_cambio("intensiva", None, perfil).imc == 21.0


# ============================================================== simulador.py · validación con el informe (3.4)
def _simular(perfil, horizonte, n=60, semilla=11, **extra):
    return simular_paciente(**perfil, horizonte_anios=horizonte, trayectorias=n, semilla=semilla, **extra)


def test_persona_2_agudo_se_diagnostica_en_alrededor_de_1_5_anios():
    r = _simular(PERSONA_2, 5)
    assert r["probHorizonte"] == 100 and 1.2 <= r["tiempoMedianoDiagnostico"] <= 2.2


def test_persona_3_inactivo_se_diagnostica_en_alrededor_de_5_anios():
    r = _simular(PERSONA_3, 15)
    assert r["probHorizonte"] >= 90 and 4.3 <= r["tiempoMedianoDiagnostico"] <= 6.5


def test_persona_1_control_tarda_casi_dos_decadas():
    r = _simular(PERSONA_1, 30, n=50)
    assert r["probHorizonte"] >= 70 and 15 <= r["tiempoMedianoDiagnostico"] <= 21


def test_persona_4_preventivo_no_desarrolla_diabetes_en_20_anios():
    r = _simular(PERSONA_4, 20, n=50)
    assert r["probHorizonte"] <= 10 and r["sinDiabetesEnHorizonte"] is True and r["tiempoMedianoDiagnostico"] is None


def test_la_estratificacion_de_riesgo_sigue_el_estilo_de_vida():
    severo = _simular({**PERSONA_3, "sedentarismo": "severo"}, 8)["tiempoLibreAnios"]
    moderado = _simular({**PERSONA_3, "sedentarismo": "moderado"}, 8)["tiempoLibreAnios"]
    activo = _simular({**PERSONA_3, "sedentarismo": "activo"}, 8)["tiempoLibreAnios"]
    assert severo < moderado <= activo


def test_la_misma_semilla_reproduce_la_simulacion_y_otra_la_cambia():
    assert _simular(PERSONA_2, 3) == _simular(PERSONA_2, 3)
    assert _simular(PERSONA_2, 3, semilla=12)["tiemposDiagnostico"] != _simular(PERSONA_2, 3)["tiemposDiagnostico"]


def test_la_dinamica_no_depende_del_horizonte_elegido():
    corto = _simular(PERSONA_3, 3)["serie"]
    largo = _simular(PERSONA_3, 6)["serie"]
    assert corto == largo[:len(corto)]


def test_el_cambio_de_estilo_de_vida_retrasa_el_diagnostico():
    base = _simular(PERSONA_3, 12)["tiempoMedianoDiagnostico"]
    cambio = CambioEstiloVida("activo", 25.0, 0)
    con_cambio = _simular(PERSONA_3, 12, cambio=cambio)
    assert con_cambio["sinDiabetesEnHorizonte"] or con_cambio["tiempoMedianoDiagnostico"] > base


def test_un_cambio_tardio_no_actua_antes_de_su_inicio():
    sin = _simular(PERSONA_3, 3)["serie"]
    tardio = _simular(PERSONA_3, 3, cambio=CambioEstiloVida("activo", 25.0, 2 * p.DIAS_POR_ANIO))["serie"]
    asta_el_anio_2 = [i for i, punto in enumerate(sin) if punto["anio"] <= 2.0]
    assert [sin[i] for i in asta_el_anio_2] == [tardio[i] for i in asta_el_anio_2]


# ============================================================== resultados.py
def test_la_serie_trimestral_y_la_incidencia_acumulada():
    r = _simular(PERSONA_2, 4)
    assert [round(s["anio"] * 4) for s in r["serie"]] == list(range(17))
    assert r["serie"][0]["incidencia"] == 0 and r["serie"][-1]["incidencia"] == r["probHorizonte"]
    assert r["serie"][0]["deficitBeta"]["p50"] == 0 and r["serie"][0]["homaIR"]["p50"] == pytest.approx(2.22, abs=0.01)


def test_la_trayectoria_de_ejemplo_termina_en_el_diagnostico():
    ultimo = _simular(PERSONA_2, 4)["trayectoriaEjemplo"][-1]
    assert ultimo["glucosa"] >= p.Y_DMT2 and 1.0 < ultimo["anio"] < 2.2
    assert 30 < ultimo["deficitBeta"] < 40


def test_sin_diagnostico_la_trayectoria_de_ejemplo_llega_al_horizonte():
    tray = _simular(PERSONA_4, 3, n=50)["trayectoriaEjemplo"]
    assert tray[-1]["anio"] == pytest.approx(3.0, abs=0.01) and tray[-1]["glucosa"] < p.Y_DMT2


def test_el_pre_diagnostico_termina_en_el_diagnostico_y_la_glucosa_sube_hacia_el():
    pre = _simular(PERSONA_1, 25, n=50)["preDiagnostico"]
    assert pre[-1]["anio"] == 0 and pre[-1]["glucosa"]["p50"] >= p.Y_DMT2
    anios = [punto["anio"] for punto in pre]
    assert anios == sorted(anios) and anios[0] < -10
    assert pre[0]["glucosa"]["p50"] < 105 < pre[-2]["glucosa"]["p50"] + 15


def test_sin_diagnosticados_no_hay_pre_diagnostico():
    assert _simular(PERSONA_4, 2, n=50)["preDiagnostico"] == []


def test_los_supuestos_listan_las_variables_aleatorias_del_informe():
    s = calcular_supuestos(40, 33.5, "severo", True)
    distribuciones = {v["distribucion"] for v in s["variablesAleatorias"]}
    assert {"Weibull", "Normal", "Gamma", "Bernoulli", "Uniforme"} <= distribuciones
    assert s["basalPaciente"]["S_I0"] == pytest.approx(sensibilidad_inicial(33.5), abs=0.001)


def test_los_escenarios_en_lote_equivalen_a_simularlos_por_separado():
    cambio = CambioEstiloVida("activo", 25.0, p.DIAS_POR_ANIO)
    lote = simular_escenarios(**PERSONA_3, horizonte_anios=4, trayectorias=40, cambios=[None, cambio], semilla=5)
    assert lote[0] == simular_paciente(**PERSONA_3, horizonte_anios=4, trayectorias=40, semilla=5)
    assert lote[1] == simular_paciente(**PERSONA_3, horizonte_anios=4, trayectorias=40, cambio=cambio, semilla=5)


@pytest.mark.parametrize("perfil, horizonte", [(PERSONA_1, 30), (PERSONA_2, 6), (PERSONA_3, 10)])
def test_el_deficit_beta_al_diagnostico_coincide_con_el_informe(perfil, horizonte):
    deficit = _simular(perfil, horizonte, n=50)["trayectoriaEjemplo"][-1]["deficitBeta"]
    assert 30 <= deficit <= 40


def test_el_tiempo_del_modelo_son_meses_de_30_dias():
    assert p.DIAS_POR_ANIO == 360 and p.DIAS_POR_TRIMESTRE_ANIO == 90
    assert p.DT == pytest.approx(1 / 150)
    assert p.LIMITE_DG == 15.0 and p.LIMITE_DI == 5.0


def test_el_diagnostico_se_registra_en_meses_y_la_edad_suma_t_diag_entre_12():
    r = _simular(PERSONA_2, 6)
    assert r["edadMedianaDiagnostico"] == pytest.approx(PERSONA_2["edad"] + r["tiempoMedianoDiagnostico"], abs=0.06)
