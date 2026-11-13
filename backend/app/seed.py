"""Siembra datos de ejemplo: un usuario demo y los mismos 4 pacientes de
ejemplo del prototipo anterior, ahora persistidos en la base de datos real.

Uso:  python -m app.seed
"""

from .database import Base, SessionLocal, engine
from .models import Patient, Scenario, User
from .security import hash_password

PACIENTES_EJEMPLO = [
    dict(nombre="Rosa Fernández", edad=52, imc=31, glucosa=108, insulina=15, hba1c=5.9,
         antecedente_familiar=True, hipertension=False, tabaquismo=False,
         notas="Sedentaria. Madre con diabetes tipo 2."),
    dict(nombre="Hugo Morales", edad=46, imc=27, glucosa=93, insulina=9, hba1c=5.4,
         antecedente_familiar=False, hipertension=False, tabaquismo=True,
         notas="Fumador. Sin antecedentes familiares conocidos."),
    dict(nombre="Elena Quispe", edad=60, imc=34, glucosa=131, insulina=19, hba1c=6.6,
         antecedente_familiar=None, hipertension=True, tabaquismo=False,
         notas="Hipertensa. En tratamiento con metformina desde hace 1 año."),
    dict(nombre="Patricio Ríos", edad=38, imc=24, glucosa=85, insulina=6, hba1c=5.1,
         antecedente_familiar=False, hipertension=False, tabaquismo=False,
         notas="Sin factores de riesgo relevantes. Control de rutina."),
]


def ejecutar():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.correo == "marina.choque@umsa.bo").first():
            db.add(User(
                nombre="Marina Choque", correo="marina.choque@umsa.bo",
                password_hash=hash_password("demo1234"), rol="medico",
            ))
        if db.query(Patient).count() == 0:
            for datos in PACIENTES_EJEMPLO:
                paciente = Patient(**datos)
                paciente.escenarios.append(Scenario(nombre="Sin cambios", nivel_intervencion="nula"))
                paciente.escenarios.append(Scenario(nombre="Intervención moderada", nivel_intervencion="moderada"))
                db.add(paciente)
        db.commit()
        print("Datos de ejemplo listos. Usuario demo: marina.choque@umsa.bo / demo1234")
    finally:
        db.close()


if __name__ == "__main__":
    ejecutar()
