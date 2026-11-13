"""Script de prueba rápida del motor, fuera del servidor HTTP (para iterar
calibración sin depender del reload de uvicorn)."""
from app.engine import simular_paciente

PACIENTES = [
    dict(nombre="Rosa", edad=52, imc=31, glucosa=108, insulina=15, hba1c=5.9, antecedente_familiar=True),
    dict(nombre="Hugo", edad=46, imc=27, glucosa=93, insulina=9, hba1c=5.4, antecedente_familiar=False),
    dict(nombre="Elena", edad=60, imc=34, glucosa=131, insulina=19, hba1c=6.6, antecedente_familiar=None),
    dict(nombre="Patricio", edad=38, imc=24, glucosa=85, insulina=6, hba1c=5.1, antecedente_familiar=False),
]

for p in PACIENTES:
    for nivel in ("nula", "moderada", "intensiva"):
        r = simular_paciente(
            edad=p["edad"], imc=p["imc"], glucosa=p["glucosa"], insulina=p["insulina"],
            hba1c=p["hba1c"], antecedente_familiar=p["antecedente_familiar"],
            nivel_intervencion=nivel, horizonte_anios=15, trayectorias=300, semilla=42,
        )
        print(f"{p['nombre']:10s} [{nivel:10s}] prob5={r['prob5']:5.1f}  probH={r['probHorizonte']:5.1f}  etapaFinal={r['etapaMediana']:12s} edadInflex={r['edadMedianaInflexion']}")
    print()
