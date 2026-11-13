"""Clasificación clínica a partir de los labs de HOY (independiente del motor
de simulación): usa la fórmula clásica de HOMA-IR y umbrales diagnósticos
estándar, no las variables latentes del modelo (S_I, C_β), que solo se usan
para proyectar el futuro en `engine.py`."""


def calcular_homa_ir(glucosa: float, insulina: float) -> float:
    return round((glucosa * insulina) / 405.0, 1)


def clasificar_etapa_clinica(glucosa: float, hba1c: float | None, homa_ir: float) -> str:
    if glucosa >= 126 or (hba1c is not None and hba1c >= 6.5):
        return "diabetes"
    if glucosa >= 100 or (hba1c is not None and hba1c >= 5.7):
        return "prediabetes"
    if homa_ir >= 2.5:
        return "resistencia"
    return "sano"
