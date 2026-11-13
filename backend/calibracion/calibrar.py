"""Calibración del motor de simulación contra rangos de la literatura.

Busca (búsqueda aleatoria + refinamiento local) los parámetros del motor
(app/engine.py) que hacen que 7 pacientes tipo reproduzcan las incidencias
de diabetes a 5 años esperadas, el efecto de las intervenciones y un
comportamiento del peso creíble. Es lo que produjo las constantes actuales.

Uso (desde backend/):
    python calibracion/calibrar.py N_ALEATORIAS N_REFINO salida.json SEMILLA [solucion_previa.json]
Ejemplo:
    python calibracion/calibrar.py 160 320 resultado.json 7

Los resultados NO se aplican solos: hay que copiar los valores ganadores a
las constantes de app/engine.py. Los rangos objetivo (CASOS) son órdenes de
magnitud tomados de la literatura, no una validación con datos locales.

Referencias de orden de magnitud: Diabetes Prevention Program (Knowler et al.,
NEJM 2002: placebo ≈ 11 casos/100 persona-años; estilo de vida intensivo
≈ −58 %; metformina ≈ −31 %), ADA (prediabetes: 5–10 %/año) y cohortes
poblacionales (normoglucemia con sobrepeso ≈ 0.5–2 %/año).
"""
import json
import math
import pathlib
import random
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from app import engine  # noqa: E402

# nombre: (edad, imc, glucosa, insulina, hba1c, familiar, (min, max) de prob5 sin cambios)
CASOS = {
    "A sano joven":          (28, 22.5, 82, 5, 5.0, False, (0, 3)),
    "B sano sobrepeso":      (35, 26.5, 88, 8, 5.2, None, (1, 9)),
    "C resistencia leve":    (41, 28.9, 92, 12, 5.4, True, (6, 24)),
    "D resistencia marcada": (47, 31.0, 96, 17, 5.5, True, (12, 38)),
    "E prediabetes inicial": (52, 29.5, 103, 14, 5.8, None, (20, 45)),
    "F prediab. obesidad":   (55, 33.0, 112, 18, 6.0, True, (30, 62)),
    "G prediab. alta":       (58, 30.0, 118, 16, 6.3, False, (40, 72)),
    "H IFG insulina baja":   (57, 29.7, 100, 10, 5.6, False, (12, 48)),
    "I IFG insulina muy baja": (50, 25.0, 105, 7, 5.7, None, (15, 52)),
    "J resistencia sin glucosa alta": (45, 30.0, 94, 14, 5.5, None, (5, 26)),
}
# cociente de la probabilidad con intervención / sin cambios (solo donde hay riesgo apreciable)
RATIO_MODERADA = (0.45, 0.85)
RATIO_INTENSIVA = (0.25, 0.60)
PESO_CASOS = {"D resistencia marcada", "E prediabetes inicial", "F prediab. obesidad", "G prediab. alta"}
CON_RATIO = {"H IFG insulina baja", "I IFG insulina muy baja", "D resistencia marcada", "E prediabetes inicial", "F prediab. obesidad", "G prediab. alta"}

ESPACIO = {   # nombre: (mínimo, máximo, escala "log" | "lin")
    "GAMMA_SCALE": (0.00002, 0.004, "log"),
    "K2": (0.000002, 0.00015, "log"),
    "K6": (0.0001, 0.008, "log"),
    "K6B": (0.00002, 0.002, "log"),
    "K7": (0.0002, 0.02, "log"),
    "T_BETA_BASAL": (0.00002, 0.0008, "log"),
    "EFICIENCIA_BALANCE": (0.10, 0.70, "lin"),
    "DERIVA_KCAL_SEMANA": (0.0, 150.0, "lin"),
    "C_BETA_DIABETES": (4.0, 30.0, "lin"),
    "PISO_PRE": (8.0, 50.0, "lin"),
    "PISO_RES": (12.0, 60.0, "lin"),
    "ADAPTACION_KCAL_KG": (30.0, 700.0, "log"),
    "MARGEN_C_BETA": (2.0, 14.0, "lin"),
}


def aplicar(p):
    for k, v in p.items():
        if k == "PISO_PRE":
            engine.PISO_C_BETA["prediabetes"] = v
        elif k == "PISO_RES":
            engine.PISO_C_BETA["resistencia"] = v
        else:
            setattr(engine, k, v)
    engine.PISO_C_BETA["sano"] = 60.0
    engine.PISO_C_BETA["diabetes"] = 0.0


from app.intervencion import peso_del_paciente, resolver_intervencion  # noqa: E402

# Las mismas plantillas que ofrece el modal de escenarios (frontend/src/lib/intervencion.ts)
PLANTILLAS = {
    "nula": None,
    "moderada": {"reduccion_kcal_dia": 300, "ejercicio_dias": 5, "ejercicio_minutos": 30, "ejercicio_intensidad": "ligera"},
    "intensiva": {"reduccion_kcal_dia": 500, "ejercicio_dias": 5, "ejercicio_minutos": 45, "ejercicio_intensidad": "moderada"},
}


def simular(caso, nivel, M=150):
    edad, imc, g, i, a1c, fam, _ = CASOS[caso]
    peso, est = peso_del_paciente(None, imc)
    interv = resolver_intervencion("personalizada", PLANTILLAS[nivel], peso, est) if PLANTILLAS[nivel] else resolver_intervencion("nula", None, peso, est)
    return engine.simular_paciente(edad=edad, imc=imc, glucosa=g, insulina=i, hba1c=a1c, antecedente_familiar=fam,
                                   intervencion=interv, horizonte_anios=5, trayectorias=M, semilla=3)


def fuera(valor, lo, hi):
    return max(0.0, lo - valor, valor - hi)


def perdida(p, detalle=False):
    aplicar(p)
    total, filas = 0.0, []
    for caso, (*_, (lo, hi)) in CASOS.items():
        rn, rm, rt = simular(caso, "nula"), simular(caso, "moderada"), simular(caso, "intensiva")
        n, m, t = rn["prob5"], rm["prob5"], rt["prob5"]
        if caso in PESO_CASOS:
            d = lambda r, a: r["resumenAnual"][a]["adiposo"]["p50"] - r["resumenAnual"][0]["adiposo"]["p50"]
            total += 25 * fuera(-d(rm, 1), 2.5, 6.5) ** 2 + 25 * fuera(-d(rm, 3), 2.5, 7.0) ** 2   # moderada: ~3–7 % del peso
            total += 25 * fuera(-d(rt, 1), 4.0, 9.0) ** 2 + 25 * fuera(-d(rt, 3), 3.0, 9.0) ** 2   # intensiva
            total += 25 * fuera(abs(d(rn, 5)), 0.0, 1.5) ** 2                                       # sin cambios: peso estable
        total += fuera(n, lo, hi) ** 2
        if caso in CON_RATIO and n > 0:
            rm, rt = m / n, t / n
            total += (100 * fuera(rm, *RATIO_MODERADA)) ** 2 + (100 * fuera(rt, *RATIO_INTENSIVA)) ** 2
        total += (max(0, t - m) ** 2) + (max(0, m - n) ** 2)       # monotonía: más intervención nunca empeora
        # coherencia con el laboratorio: la glucosa que reproduce el modelo con el estado inicial no debe alejarse de la medida
        edad_, imc_, g_, i_, a1c_, fam_, _ = CASOS[caso]
        e = engine.estado_inicial_completo(g_, i_, imc_, a1c_)
        d = engine.D_INS_BASAL / e["sI0"]
        g_modelo = engine.G_BASAL + max(0.0, d - min(d, e["cBeta0"] / 100 * engine.I_SEC_MAX)) * engine.K5
        total += 4 * max(0.0, abs(g_modelo - g_) - 6.0) ** 2
        filas.append((caso, n, m, t))
    return (total, filas) if detalle else total


def muestrear(rng):
    p = {}
    for k, (lo, hi, esc) in ESPACIO.items():
        p[k] = math.exp(rng.uniform(math.log(lo), math.log(hi))) if esc == "log" else rng.uniform(lo, hi)
    return p


def perturbar(p, rng, sigma):
    q = {}
    for k, (lo, hi, esc) in ESPACIO.items():
        if esc == "log":
            v = math.exp(math.log(p[k]) + rng.gauss(0, sigma * (math.log(hi) - math.log(lo))))
        else:
            v = p[k] + rng.gauss(0, sigma * (hi - lo))
        q[k] = min(hi, max(lo, v))
    return q


if __name__ == "__main__":
    n_aleatorias, n_refino = int(sys.argv[1]), int(sys.argv[2])
    salida = sys.argv[3]
    rng = random.Random(int(sys.argv[4]))
    mejor, mejor_l = None, float("inf")
    t0 = time.time()
    if len(sys.argv) > 5:
        previa = json.load(open(sys.argv[5]))["parametros"]
        previa.setdefault("ADAPTACION_KCAL_KG", 200.0)
        previa.setdefault("MARGEN_C_BETA", 8.0)
        pass
        mejor, mejor_l = previa, perdida(previa)
        print(f"arranque desde solución previa: pérdida {mejor_l:.1f}", flush=True)
    for it in range(n_aleatorias):
        p = muestrear(rng)
        l = perdida(p)
        if l < mejor_l:
            mejor, mejor_l = p, l
            json.dump({"perdida": l, "parametros": mejor}, open(salida, "w"))
            print(f"[{time.time()-t0:5.0f}s] aleatoria {it}: pérdida {l:.1f}", flush=True)
    sigma = 0.15
    for it in range(n_refino):
        q = perturbar(mejor, rng, sigma)
        l = perdida(q)
        if l < mejor_l:
            mejor, mejor_l = q, l
            json.dump({"perdida": l, "parametros": mejor}, open(salida, "w"))
            print(f"[{time.time()-t0:5.0f}s] refino {it} (σ={sigma:.3f}): pérdida {l:.1f}", flush=True)
        if it % 40 == 39:
            sigma = max(0.02, sigma * 0.7)
    total, filas = perdida(mejor, detalle=True)
    print("\nMEJOR pérdida:", round(total, 2))
    print(json.dumps(mejor, indent=1))
    for caso, n, m, t in filas:
        print(f"  {caso:24s} nula {n:5.1f}  moderada {m:5.1f}  intensiva {t:5.1f}")
