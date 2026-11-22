"""Uso: python -m app.scripts.probar_motor. Corre fuera del servidor las cuatro personas de prueba del informe (3.4.1) y compara con sus resultados."""
from app.motor import simular_paciente

PERSONAS = [
    ("Persona 1 · Control", dict(edad=20, imc=19.0, sedentarismo="moderado", antecedente_familiar=False), 30, "18.9 años"),
    ("Persona 2 · Agudo", dict(edad=40, imc=33.5, sedentarismo="severo", antecedente_familiar=True), 10, "1.5 años"),
    ("Persona 3 · Riesgo por inactividad", dict(edad=20, imc=25.0, sedentarismo="severo", antecedente_familiar=False), 10, "5.0 años"),
    ("Persona 4 · Preventivo", dict(edad=65, imc=22.0, sedentarismo="activo", antecedente_familiar=False), 30, "sin diabetes"),
]

for nombre, perfil, horizonte, esperado in PERSONAS:
    r = simular_paciente(**perfil, horizonte_anios=horizonte, trayectorias=200, semilla=42)
    mediano = r["tiempoMedianoDiagnostico"]
    obtenido = "sin diabetes" if mediano is None else f"{mediano:.1f} años"
    print(f"{nombre:36s} informe: {esperado:13s} simulador: {obtenido:13s} P(≤5 años) = {r['prob5']:5.1f} %")
