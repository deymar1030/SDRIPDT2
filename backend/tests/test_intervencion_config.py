"""Traducción de hábitos a efectos del modelo y configuración (BD / entorno)."""

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.intervencion import (
    dosis_r7, kcal_ejercicio_semana, met_min_semana, peso_del_paciente, resolver_intervencion,
)


# ----------------------------------------------------------------- intervención
def test_kcal_de_ejercicio_por_mets():
    # 5 días × 45 min × 6 MET × 3.5 × 70 kg / 200
    assert kcal_ejercicio_semana(5, 45, "moderada", 70) == pytest.approx(1653.75)
    assert met_min_semana(5, 30, "ligera") == 525


@pytest.mark.parametrize("kcal, met_min, esperado", [
    (0, 0, 0.0), (500, 600, 1.0), (250, 0, 0.25), (0, 300, 0.25), (1000, 5000, 1.0),   # satura en 1
])
def test_dosis_de_r7(kcal, met_min, esperado):
    assert dosis_r7(kcal, met_min) == pytest.approx(esperado)


def test_peso_registrado_y_peso_estimado():
    assert peso_del_paciente(80, 30) == (80.0, False)
    peso, estimado = peso_del_paciente(None, 27)
    assert estimado is True and peso == pytest.approx(70.9, abs=0.1)


def test_escenario_antiguo_usa_la_tabla_fija():
    nula = resolver_intervencion("nula", None, 70, True)
    moderada = resolver_intervencion("moderada", None, 70, True)
    intensiva = resolver_intervencion("intensiva", None, 70, True)
    assert nula["activa"] is False and nula["dosisR7"] == 0
    assert (moderada["pctEcal"], moderada["gActSemana"], moderada["dosisR7"]) == (-0.15, 500.0, 1.0)
    assert (intensiva["pctEcal"], intensiva["gActSemana"]) == (-0.30, 1200.0)


def test_escenario_configurable_sin_habitos_no_interviene():
    r = resolver_intervencion("personalizada", {"reduccion_kcal_dia": 0, "ejercicio_dias": 0, "ejercicio_minutos": 0}, 70, False)
    assert r["activa"] is False and r["dosisR7"] == 0 and r["gActSemana"] == 0


def test_escenario_configurable_calendario():
    base = {"reduccion_kcal_dia": 300, "ejercicio_dias": 3, "ejercicio_minutos": 30, "ejercicio_intensidad": "ligera"}
    r = resolver_intervencion("personalizada", {**base, "inicio_anio": 2, "duracion_anios": 3}, 70, False)
    assert (r["semanaInicio"], r["semanaFin"]) == (104, 260)
    assert resolver_intervencion("personalizada", base, 70, False)["semanaFin"] is None   # hasta el final


# ----------------------------------------------------------------- configuración
def _ajustes(**kw):
    return Settings(_env_file=None, jwt_secret="x", database_url=None, **kw)


def test_url_postgres_desde_partes_escapa_la_contrasena():
    s = _ajustes(postgres_host="db", postgres_user="admin", postgres_password="p@ss:w/rd%#1", postgres_db="simulador")
    assert s.url_base_datos == "postgresql+psycopg://admin:p%40ss%3Aw%2Frd%25%231@db:5432/simulador"
    assert not s.es_sqlite


@pytest.mark.parametrize("url", ["postgres://u:p@h:5432/d", "postgresql://u:p@h:5432/d"])
def test_url_de_coolify_recibe_el_driver_psycopg(url):
    assert Settings(_env_file=None, jwt_secret="x", database_url=url).url_base_datos == "postgresql+psycopg://u:p@h:5432/d"


def test_sqlite_se_reconoce():
    assert Settings(_env_file=None, jwt_secret="x", database_url="sqlite:///./x.db").es_sqlite


def test_sin_base_de_datos_configurada_falla_con_mensaje_claro():
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        _ajustes().url_base_datos


def test_jwt_secret_es_obligatoria_y_no_puede_estar_vacia(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)   # el entorno de pruebas la define; aquí debe faltar
    with pytest.raises(ValidationError):
        Settings(_env_file=None, jwt_secret="", database_url="sqlite:///./x.db")
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url="sqlite:///./x.db")


def test_origenes_cors_se_separan_por_comas():
    s = Settings(_env_file=None, jwt_secret="x", database_url="sqlite:///./x.db", cors_origins="http://a.bo, http://b.bo,")
    assert s.cors_origins_list == ["http://a.bo", "http://b.bo"]
