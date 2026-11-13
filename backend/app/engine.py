"""
Motor de simulación — implementa el modelo formal de
"Modelo_Simulacion_DMT2_LaPaz_Calibrado.pdf": dinámica de sistemas en tiempo
discreto (Δt = 1 semana) con generación estocástica de trayectorias (Monte
Carlo), componentes A–D y reglas de interacción R1–R7.

Cada réplica de la simulación representa una trayectoria futura posible de
UN paciente real y concreto (no una cohorte sintética): el estado inicial se
estima a partir de sus datos clínicos de hoy (ver `estimar_estado_inicial`),
y las M trayectorias difieren entre sí únicamente por el camino aleatorio que
toman hacia adelante (E_cal, G_act, T_β, y el factor genético si se
desconoce).

Supuestos de calibración NO fijados por el documento original (que los deja
como pendientes de "Objetivo Específico 2") y que aquí se fijan de forma
explícita y documentada, a falta de datos de SNIS-VE/SEDES La Paz/IDF:

- D_INS_BASAL=6.0, I_SEC_MAX=60.0 (dado), G_ACT_MAX=3500 (dado como rango).
- Escenarios configurables (comida/ejercicio/calendario): ver intervencion.py.
- k2, k5, k6, k6b, k7, T_BETA_BASAL: elegidos para que la progresión completa
  (Sano → Resistencia → Prediabetes → DMT2) tome, en un paciente con
  sobrepeso moderado y sedentarismo, un orden de magnitud de años-a-décadas,
  consistente con la fisiopatología descrita en el documento.
- T_β ~ Gamma(shape=2, scale=0.0015) (media≈0.003, dentro de [0.0001,0.015]).
- α_gen fijo en 1.4 (punto medio del rango [1.20,1.60] dado).
- Línea base de E_cal/G_act por paciente: se deriva de su IMC actual (no hay
  variable de dieta/actividad en el formulario de registro todavía), y queda
  marcada aquí como el supuesto más provisional de todo el motor.
- Estado inicial (S_I, C_β, M_adip) para un paciente real: se infiere de sus
  labs de hoy (glucosa, insulina, IMC) en `estimar_estado_inicial`, en vez de
  sortearse de los priors poblacionales Edad_0~U(18,55) / S_I(0)~N(1,0.1) que
  el documento define para generar una cohorte sintética desde cero.
"""

from __future__ import annotations

import numpy as np

from .clinical import clasificar_etapa_clinica

# ---------------- Parámetros fijos por el documento ----------------
K_CAL = 7700.0          # kcal por kg de tejido adiposo
G_ACT_MAX = 3500.0      # kcal/semana, techo del rango de actividad física
I_SEC_MAX = 60.0        # µU/mL, secreción máxima posible
G_BASAL = 85.0          # mg/dL, glucemia basal normoglicémica
GAMMA_PRED = 100.0      # mg/dL, umbral prediabetes (ADA/OMS)
GAMMA_DMT2 = 126.0      # mg/dL, umbral DMT2
P_GEN_PROB = 0.35       # Bernoulli(p) del factor genético cuando se desconoce
ALPHA_GEN = 1.4         # punto medio de [1.20, 1.60]
THETA_UMB = 0.5         # punto medio de [0.40, 0.60]

# ---------------- Supuestos de calibración (no dados por el documento) ----------------
D_INS_BASAL = 6.0
K2 = 0.00015
K5 = 1.5
K6 = 0.005
K6B = 0.0015
K7 = 0.06
T_BETA_BASAL = 0.0005
GAMMA_SHAPE = 2.0
GAMMA_SCALE = 0.0015

INTERVENCION = {
    "nula": {"d_ecal": 0.0, "d_gact": 0.0},
    "moderada": {"d_ecal": -0.15, "d_gact": 500.0},
    "intensiva": {"d_ecal": -0.30, "d_gact": 1200.0},
}

ETAPAS = ["sano", "resistencia", "prediabetes", "diabetes"]


def estimar_estado_inicial(glucosa: float, insulina: float, imc: float) -> tuple[float, float, float]:
    """Infiere (S_I0, C_beta0, M_adip0) a partir de labs observables de HOY.

    No es una inversión exacta del modelo (el documento mismo deja esa
    calibración pendiente); es una aproximación transparente, construida
    para reproducir EXACTAMENTE la glucosa y la insulina medidas de hoy al
    recalcularlas con las fórmulas del modelo (R3/R5):

    1. La insulina medida de hoy ES I_sec(0) (la secreción real observada).
    2. El "déficit" implícito por la glucosa elevada da D_ins(0) = I_sec(0) + déficit.
    3. S_I(0) = D_INS_BASAL / D_ins(0).
    4. Si hay déficit (D_ins0 > I_sec0), el modelo obliga a que la secreción
       esté exactamente en el techo de capacidad, de donde C_β(0) =
       100·I_sec(0)/I_SEC_MAX; si no hay déficit, se asume reserva sana (100%).
    """
    i_sec0 = max(float(insulina), 0.5)
    deficit = max(0.0, (float(glucosa) - G_BASAL) / K5)
    d_ins0 = float(np.clip(i_sec0 + deficit, 2.0, 60.0))
    s_i0 = float(np.clip(D_INS_BASAL / d_ins0, 0.05, 1.5))
    if deficit < 1.0:
        c_beta0 = 100.0
    else:
        c_beta0 = float(np.clip(100.0 * i_sec0 / I_SEC_MAX, 5.0, 100.0))
    m_adip0 = float(np.clip((float(imc) - 22.0) * 2.5, 0.0, 80.0))
    return s_i0, c_beta0, m_adip0


PISO_C_BETA = {"sano": 70.0, "resistencia": 55.0, "prediabetes": 35.0, "diabetes": 0.0}


def estado_inicial_completo(glucosa: float, insulina: float, imc: float, hba1c: float | None) -> dict:
    """Estado latente de HOY (S_I, C_β, M_adip) más la etapa clínica, con el
    piso de C_β por etapa ya aplicado. Lo usan tanto la simulación como la
    ficha del paciente, para que ambas muestren exactamente el mismo punto
    de partida.

    El piso existe porque la inversión puede devolver una reserva ≤30% (el
    propio criterio de "diabetes" del motor) para alguien que hoy NO es
    diabético: el modelo fuerza C_β=100·I_sec/I_sec_max en cuanto hay
    cualquier déficit, sin importar qué tan pequeño."""
    s_i0, c_beta0, m_adip0 = estimar_estado_inicial(glucosa, insulina, imc)
    homa_ir_hoy = (glucosa * insulina) / 405.0
    etapa_hoy = clasificar_etapa_clinica(glucosa, hba1c, homa_ir_hoy)
    c_beta0 = max(c_beta0, PISO_C_BETA[etapa_hoy])
    return {"sI0": s_i0, "cBeta0": c_beta0, "mAdip0": m_adip0, "etapa": etapa_hoy, "homaIR": homa_ir_hoy}


def calcular_supuestos(imc: float, antecedente_familiar: bool | None) -> dict:
    """Describe las 4 variables aleatorias de entrada del modelo (componente
    A/C) y los parámetros fijos, con los valores concretos que esta
    simulación usará para ESTE paciente — para que se puedan ver en la UI,
    no solo en el código."""
    g_act_base = float(np.clip(1200.0 - (imc - 22.0) * 40.0, 100.0, 1200.0))
    e_cal_base = g_act_base / 7.0
    lo, hi = max(0.0, g_act_base - 300.0), min(3500.0, g_act_base + 300.0)

    if antecedente_familiar is None:
        p_gen_desc = f"Bernoulli(p={P_GEN_PROB}) — se sortea por trayectoria (antecedente familiar no registrado)"
    else:
        p_gen_desc = f"Fijo = {'1 (con antecedente)' if antecedente_familiar else '0 (sin antecedente)'} — dato conocido del paciente"

    return {
        "variablesAleatorias": [
            {"simbolo": "E_cal", "nombre": "Excedente de ingesta calórica diaria",
             "distribucion": "Normal", "parametros": f"media={e_cal_base:.0f} kcal/día, σ=100"},
            {"simbolo": "G_act", "nombre": "Gasto metabólico semanal por actividad física",
             "distribucion": "Uniforme", "parametros": f"[{lo:.0f}, {hi:.0f}] kcal/semana"},
            {"simbolo": "T_β", "nombre": "Tasa de agotamiento de células beta",
             "distribucion": "Gamma", "parametros": f"forma={GAMMA_SHAPE}, escala={GAMMA_SCALE} (media≈0.003/semana)"},
            {"simbolo": "P_gen", "nombre": "Predisposición genética hereditaria",
             "distribucion": "Bernoulli" if antecedente_familiar is None else "Fijo (dato conocido)",
             "parametros": p_gen_desc},
        ],
        "parametrosFijos": {
            "k2 (resistencia periférica)": K2, "k5 (glucosa por déficit de insulina)": K5,
            "k6 (glucotoxicidad sobre T_β)": K6, "k6b (glucotoxicidad sobre S_I)": K6B,
            "k7 (recuperación por intervención)": K7, "T_β basal": T_BETA_BASAL,
            "α_gen (penalización genética)": ALPHA_GEN, "θ_umb (umbral de sobrecarga)": THETA_UMB,
            "D_ins_basal": D_INS_BASAL, "I_sec_max": I_SEC_MAX,
        },
        "basalPaciente": {"eCalBase": round(e_cal_base, 1), "gActBase": round(g_act_base, 1)},
    }


def _clasificar(g_ayunas: np.ndarray, c_beta: np.ndarray, r_homa: np.ndarray) -> np.ndarray:
    etapas = np.full(g_ayunas.shape, "sano", dtype=object)
    etapas[r_homa >= 2.5] = "resistencia"
    etapas[g_ayunas >= GAMMA_PRED] = "prediabetes"
    etapas[(g_ayunas >= GAMMA_DMT2) | (c_beta <= 30.0)] = "diabetes"
    return etapas


def simular_paciente(
    *,
    edad: float,
    imc: float,
    glucosa: float,
    insulina: float,
    hba1c: float | None,
    antecedente_familiar: bool | None,
    horizonte_anios: int,
    trayectorias: int,
    nivel_intervencion: str = "nula",
    intervencion: dict | None = None,
    semilla: int | None = None,
) -> dict:
    """Corre M trayectorias Monte Carlo (reglas R1–R7) ancladas al estado
    inicial inferido de ESTE paciente, bajo un escenario de intervención.

    `intervencion` es el efecto ya resuelto del escenario (ver
    `intervencion.resolver_intervencion`). Si no se pasa, se usa la tabla
    fija INTERVENCION según `nivel_intervencion` (comportamiento original)."""

    rng = np.random.default_rng(semilla)
    M = trayectorias
    semanas = horizonte_anios * 52

    # La semana 0 muestra la etapa clínica real de hoy (umbrales estándar);
    # desde la semana 1 la proyección usa el clasificador mecánico del modelo.
    inicial = estado_inicial_completo(glucosa, insulina, imc, hba1c)
    s_i0, c_beta0, m_adip0 = inicial["sI0"], inicial["cBeta0"], inicial["mAdip0"]
    etapa_hoy, homa_ir_hoy = inicial["etapa"], inicial["homaIR"]

    S_I = np.clip(np.full(M, s_i0) + rng.normal(0.0, 0.05, M), 0.05, 1.5)
    M_adip = np.full(M, m_adip0)
    C_beta = np.full(M, c_beta0)

    if antecedente_familiar is None:
        P_gen = (rng.random(M) < P_GEN_PROB).astype(float)
    else:
        P_gen = np.full(M, 1.0 if antecedente_familiar else 0.0)

    # Línea base para el escenario "sin cambios": balance energético ≈ 0
    # (7·E_cal_base ≈ G_act_base), para que "mantener el hábito actual" no
    # implique, por construcción, una tendencia sistemática a subir o bajar
    # de peso — el único motor de cambio pasa a ser el ruido semanal y las
    # reglas R2/R4/R6. G_act_base sigue sirviendo de proxy de sedentarismo
    # (más bajo cuanto mayor el IMC actual), ya que no se recoge todavía un
    # dato de actividad física real en el registro del paciente.
    g_act_base = float(np.clip(1200.0 - (imc - 22.0) * 40.0, 100.0, 1200.0))
    e_cal_base = g_act_base / 7.0

    if intervencion is None:
        activa = nivel_intervencion in ("moderada", "intensiva")
        intervencion = {
            "activa": activa,
            "pctEcal": INTERVENCION[nivel_intervencion]["d_ecal"],
            "kcalDia": 0.0,
            "gActSemana": INTERVENCION[nivel_intervencion]["d_gact"],
            "dosisR7": 1.0 if activa else 0.0,
            "semanaInicio": 0,
            "semanaFin": None,
        }
    hay_intervencion = bool(intervencion["activa"])
    pct_ecal = float(intervencion["pctEcal"])        # cambio relativo de E_cal (escenarios fijos)
    kcal_dia = float(intervencion["kcalDia"])        # kcal/día que se restan a E_cal (configurables)
    d_gact = float(intervencion["gActSemana"])       # kcal/semana que se suman a G_act
    k7_efectivo = K7 * float(intervencion["dosisR7"])
    semana_inicio = int(intervencion["semanaInicio"])
    semana_fin = intervencion["semanaFin"]

    edad_inflex = np.full(M, np.nan)
    ya_diabetico = np.zeros(M, dtype=bool)

    n_puntos = horizonte_anios + 1
    bandas = {m: {"p10": np.zeros(n_puntos), "p50": np.zeros(n_puntos), "p90": np.zeros(n_puntos)}
              for m in ("glucosa", "insulina", "homaIR", "reserva", "sensibilidad", "adiposo")}
    etapa_pct = {e: np.zeros(n_puntos) for e in ETAPAS}

    def snapshot(idx: int, g_ayunas, i_sec, r_homa, c_beta, etapas):
        for nombre, arr in (("glucosa", g_ayunas), ("insulina", i_sec), ("homaIR", r_homa), ("reserva", c_beta),
                            ("sensibilidad", S_I), ("adiposo", M_adip)):
            s = np.sort(arr)
            bandas[nombre]["p10"][idx] = s[int(0.1 * (M - 1))]
            bandas[nombre]["p50"][idx] = s[int(0.5 * (M - 1))]
            bandas[nombre]["p90"][idx] = s[int(0.9 * (M - 1))]
        for e in etapa_pct:
            etapa_pct[e][idx] = 100.0 * float(np.mean(etapas == e))

    def calcular_observables(s_i, c_beta):
        d_ins = np.clip(D_INS_BASAL / np.maximum(s_i, 0.05), 2.0, 60.0)
        i_sec = np.minimum(d_ins, (c_beta / 100.0) * I_SEC_MAX)
        g_ayunas = np.clip(G_BASAL + np.maximum(0.0, d_ins - i_sec) * K5, 70.0, 350.0)
        r_homa = np.clip(1.0 / np.maximum(s_i, 0.001), 0.5, 15.0)
        return d_ins, i_sec, g_ayunas, r_homa

    # --- semana 0: se reportan los labs REALES de hoy, no una recomputación
    # (que ya no coincidiría exactamente una vez aplicado el piso de C_β0) ---
    G_ayunas = np.full(M, float(glucosa))
    I_sec = np.full(M, float(insulina))
    R_homa = np.full(M, float(np.clip(homa_ir_hoy, 0.5, 15.0)))
    etapas = np.full(M, etapa_hoy, dtype=object)  # ver nota arriba: etapa de HOY, no la mecánica
    snapshot(0, G_ayunas, I_sec, R_homa, C_beta, etapas)
    if etapa_hoy == "diabetes":
        edad_inflex[:] = edad
        ya_diabetico[:] = True

    for t in range(1, semanas + 1):
        e_cal = np.clip(rng.normal(e_cal_base, 100.0, M), -500.0, 2500.0)
        lo, hi = max(0.0, g_act_base - 300.0), min(3500.0, g_act_base + 300.0)
        g_act = rng.uniform(lo, hi, M)

        # La intervención rige solo dentro de su ventana [inicio, fin) y deja
        # de aplicarse a una trayectoria en cuanto esta llega a diabetes.
        en_ventana = hay_intervencion and t > semana_inicio and (semana_fin is None or t <= semana_fin)
        aplica_interv = np.logical_and(en_ventana, ~ya_diabetico)
        e_cal = np.where(aplica_interv, e_cal * (1.0 + pct_ecal) - kcal_dia, e_cal)
        g_act = np.clip(np.where(aplica_interv, g_act + d_gact, g_act), 0.0, 3500.0)

        b_neto = 7.0 * e_cal - g_act

        # R3 / observables de este paso, con S_I y C_β vigentes (t)
        D_ins, I_sec, G_ayunas, R_homa = calcular_observables(S_I, C_beta)

        # T_β ~ Gamma, y R6: retroalimentación por glucotoxicidad
        T_beta = np.clip(rng.gamma(GAMMA_SHAPE, GAMMA_SCALE, M), 0.0001, 0.015)
        mask_glucotox = G_ayunas > GAMMA_PRED
        T_beta = np.where(mask_glucotox, T_beta * (1.0 + K6 * (G_ayunas - GAMMA_PRED)), T_beta)
        S_I = np.where(mask_glucotox, S_I * (1.0 - K6B), S_I)

        # R4: agotamiento de células beta
        mask_umbral = S_I < THETA_UMB
        delta_c = np.where(mask_umbral, 100.0 * T_beta * (1.0 + (ALPHA_GEN - 1.0) * P_gen), 100.0 * T_BETA_BASAL)
        C_beta = np.clip(C_beta - delta_c, 0.0, 100.0)

        # R2: inducción de resistencia periférica
        S_I = np.clip(S_I - K2 * M_adip * (1.0 - g_act / G_ACT_MAX) * (1.0 + (ALPHA_GEN - 1.0) * P_gen), 0.05, 1.5)
        # R7: recuperación parcial por intervención preventiva
        S_I = np.where(aplica_interv, np.clip(S_I + k7_efectivo * (1.0 - S_I), 0.05, 1.5), S_I)

        # R1: lipogénesis por superávit energético. El documento original solo
        # acumula superávit (max(0,·), nunca reduce con déficit), lo cual es
        # razonable para el escenario "sin cambios" (fluctuación pasiva), pero
        # bajo intervención activa (dieta + ejercicio sostenidos) la masa
        # grasa SÍ puede reducirse con un balance negativo real — es una
        # extensión deliberada sobre R1, no está en el documento original.
        incremento_adip = np.where(aplica_interv, b_neto, np.maximum(0.0, b_neto))
        M_adip = np.clip(M_adip + incremento_adip / K_CAL, 0.0, 80.0)

        # R5: punto de inflexión (se evalúa con los observables de ESTE paso)
        etapas = _clasificar(G_ayunas, C_beta, R_homa)
        nuevo = (etapas == "diabetes") & ~ya_diabetico
        edad_inflex[nuevo] = edad + t / 52.0
        ya_diabetico |= etapas == "diabetes"

        if t % 52 == 0:
            snapshot(t // 52, G_ayunas, I_sec, R_homa, C_beta, etapas)

    prob5 = 100.0 * float(np.mean(~np.isnan(edad_inflex) & (edad_inflex <= edad + 5)))
    prob_horizonte = 100.0 * float(np.mean(~np.isnan(edad_inflex)))
    edades_validas = edad_inflex[~np.isnan(edad_inflex)]
    edad_mediana_inflex = float(np.median(edades_validas)) if edades_validas.size else None

    etapa_final = {e: etapa_pct[e][-1] for e in ETAPAS}
    etapa_mediana = max(etapa_final, key=etapa_final.get)

    resumen_anual = [
        {
            "anio": i,
            "glucosa": {k: round(float(bandas["glucosa"][k][i]), 1) for k in ("p10", "p50", "p90")},
            "insulina": {k: round(float(bandas["insulina"][k][i]), 1) for k in ("p10", "p50", "p90")},
            "homaIR": {k: round(float(bandas["homaIR"][k][i]), 2) for k in ("p10", "p50", "p90")},
            "reserva": {k: round(float(bandas["reserva"][k][i]), 1) for k in ("p10", "p50", "p90")},
            "sensibilidad": {k: round(float(bandas["sensibilidad"][k][i]), 3) for k in ("p10", "p50", "p90")},
            "adiposo": {k: round(float(bandas["adiposo"][k][i]), 1) for k in ("p10", "p50", "p90")},
            "etapaPct": {e: round(float(etapa_pct[e][i]), 1) for e in ETAPAS},
        }
        for i in range(n_puntos)
    ]

    return {
        "resumenAnual": resumen_anual,
        "prob5": round(prob5),
        "probHorizonte": round(prob_horizonte),
        "etapaMediana": etapa_mediana,
        "edadMedianaInflexion": round(edad_mediana_inflex, 1) if edad_mediana_inflex is not None else None,
        "estadoInicial": {"sI0": round(s_i0, 3), "cBeta0": round(c_beta0, 1), "mAdip0": round(m_adip0, 1)},
    }
