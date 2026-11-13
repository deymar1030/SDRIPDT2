"""API completa: autenticación, seguridad, pacientes, escenarios, simulación,
historial y priorización de riesgo."""

import datetime as dt

import jwt
import pytest

from app.config import settings

# ============================================================== autenticación
def _login(cliente, correo, password):
    return cliente.post("/auth/login", data={"username": correo, "password": password})


def test_salud(cliente):
    assert cliente.get("/salud").json() == {"estado": "ok"}


def test_registro_devuelve_token_y_no_expone_la_contrasena(cliente):
    r = cliente.post("/auth/registro", json={"nombre": "Ana", "correo": "Ana.Perez@Hospital.BO", "password": "secreto123", "rol": "medico"})
    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["access_token"] and cuerpo["usuario"]["correo"] == "ana.perez@hospital.bo"   # normalizado a minúsculas
    assert "password" not in str(cuerpo).lower() or "password_hash" not in cuerpo["usuario"]
    assert "password_hash" not in cuerpo["usuario"]


def test_registro_rechaza_correo_duplicado_sin_importar_mayusculas(cliente):
    cliente.post("/auth/registro", json={"nombre": "Beto", "correo": "beto@hospital.bo", "password": "secreto123"})
    r = cliente.post("/auth/registro", json={"nombre": "Otro", "correo": "BETO@hospital.bo", "password": "secreto123"})
    assert r.status_code == 400


@pytest.mark.parametrize("cuerpo", [
    {"nombre": "X", "correo": "no-es-correo", "password": "secreto123"},
    {"nombre": "X", "correo": "x@y.bo", "password": "123"},          # contraseña demasiado corta
    {"nombre": "X", "correo": "x@y.bo"},                              # falta la contraseña
])
def test_registro_valida_los_datos(cliente, cuerpo):
    assert cliente.post("/auth/registro", json=cuerpo).status_code == 422


def test_login_correcto_y_correo_en_mayusculas(cliente, auth):
    assert _login(cliente, "doctora@prueba.bo", "clave-prueba").status_code == 200
    assert _login(cliente, "DOCTORA@Prueba.BO", "clave-prueba").status_code == 200


def test_login_con_clave_o_usuario_incorrectos(cliente, auth):
    assert _login(cliente, "doctora@prueba.bo", "mala").status_code == 401
    assert _login(cliente, "nadie@prueba.bo", "clave-prueba").status_code == 401


def test_yo_devuelve_el_usuario_de_la_sesion(cliente, auth):
    r = cliente.get("/auth/yo", headers=auth)
    assert r.status_code == 200 and r.json()["correo"] == "doctora@prueba.bo"


def test_editar_perfil(cliente):
    tok = cliente.post("/auth/registro", json={"nombre": "Perfil", "correo": "perfil@prueba.bo", "password": "secreto123"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    r = cliente.patch("/auth/perfil", json={"nombre": "Perfil Nuevo", "correo": "Perfil.Nuevo@prueba.bo"}, headers=h)
    assert r.status_code == 200 and r.json()["nombre"] == "Perfil Nuevo" and r.json()["correo"] == "perfil.nuevo@prueba.bo"


def test_editar_perfil_no_permite_tomar_el_correo_de_otro(cliente, auth):
    r = cliente.patch("/auth/perfil", json={"nombre": "Doctora", "correo": "beto@hospital.bo"}, headers=auth)
    assert r.status_code == 400


def test_cambiar_contrasena(cliente):
    tok = cliente.post("/auth/registro", json={"nombre": "Clave", "correo": "clave@prueba.bo", "password": "vieja-clave"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    assert cliente.post("/auth/password", json={"actual": "incorrecta", "nueva": "nueva-clave"}, headers=h).status_code == 400
    assert cliente.post("/auth/password", json={"actual": "vieja-clave", "nueva": "nueva-clave"}, headers=h).status_code == 204
    assert _login(cliente, "clave@prueba.bo", "vieja-clave").status_code == 401
    assert _login(cliente, "clave@prueba.bo", "nueva-clave").status_code == 200


# ============================================================== seguridad
RUTAS_PROTEGIDAS = [
    ("GET", "/pacientes"), ("GET", "/pacientes/riesgo"), ("POST", "/pacientes"), ("GET", "/pacientes/1"),
    ("GET", "/pacientes/1/escenarios"), ("POST", "/pacientes/1/escenarios"), ("PUT", "/pacientes/1/escenarios/1"),
    ("DELETE", "/pacientes/1/escenarios/1"), ("POST", "/pacientes/1/simular"), ("GET", "/pacientes/1/simulaciones"),
    ("GET", "/pacientes/1/simulaciones/1"), ("GET", "/auth/yo"), ("PATCH", "/auth/perfil"), ("POST", "/auth/password"),
]


@pytest.mark.parametrize("metodo, ruta", RUTAS_PROTEGIDAS)
def test_las_rutas_exigen_sesion(cliente, metodo, ruta):
    assert cliente.request(metodo, ruta).status_code == 401


def test_token_invalido_manipulado_o_vencido_se_rechaza(cliente, auth):
    assert cliente.get("/auth/yo", headers={"Authorization": "Bearer basura"}).status_code == 401
    token = auth["Authorization"].split()[1]
    assert cliente.get("/auth/yo", headers={"Authorization": f"Bearer {token[:-3]}abc"}).status_code == 401   # firma alterada
    firmado_con_otra_clave = jwt.encode({"sub": "1", "exp": dt.datetime.utcnow() + dt.timedelta(hours=1)}, "otra-clave", algorithm="HS256")
    assert cliente.get("/auth/yo", headers={"Authorization": f"Bearer {firmado_con_otra_clave}"}).status_code == 401
    vencido = jwt.encode({"sub": "1", "exp": dt.datetime.utcnow() - dt.timedelta(minutes=1)}, settings.jwt_secret, algorithm="HS256")
    assert cliente.get("/auth/yo", headers={"Authorization": f"Bearer {vencido}"}).status_code == 401


def test_las_contrasenas_se_guardan_con_hash_bcrypt(cliente, auth):
    from app.database import SessionLocal
    from app.models import User

    with SessionLocal() as db:
        for u in db.query(User).all():
            assert u.password_hash.startswith("$2") and "clave" not in u.password_hash


# ============================================================== pacientes
@pytest.mark.parametrize("glucosa, insulina, hba1c, etapa", [
    (82, 5, 5.0, "sano"), (92, 12, 5.4, "resistencia"), (108, 15, 5.9, "prediabetes"), (131, 19, 6.6, "diabetes"),
])
def test_paciente_se_clasifica_al_registrarse(crear_paciente, glucosa, insulina, hba1c, etapa):
    p = crear_paciente(glucosa=glucosa, insulina=insulina, hba1c=hba1c)
    assert p["etapaActual"] == etapa
    assert p["homaIR"] == pytest.approx(glucosa * insulina / 405, abs=0.06)
    assert set(p["estadoLatente"]) == {"sI0", "cBeta0", "mAdip0"}
    assert (p["peso"], p["talla"]) == (79, 160)


@pytest.mark.parametrize("campo, valor", [
    ("glucosa", 39), ("glucosa", 401), ("insulina", 0), ("insulina", 101), ("hba1c", 2.9), ("hba1c", 15.1),
    ("edad", 0), ("edad", 111), ("imc", 11), ("imc", 71), ("peso", 19), ("peso", 301), ("talla", 99), ("talla", 231),
])
def test_paciente_rechaza_valores_fuera_de_rango(cliente, auth, campo, valor):
    from tests.conftest import PACIENTE_BASE

    r = cliente.post("/pacientes", json={**PACIENTE_BASE, campo: valor}, headers=auth)
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"][-1] == campo


def test_paciente_acepta_los_extremos_validos(crear_paciente):
    assert crear_paciente(glucosa=40, insulina=1, hba1c=3)["id"]
    assert crear_paciente(glucosa=400, insulina=100, hba1c=15)["id"]


def test_paciente_conserva_acentos_y_antecedente_desconocido(cliente, auth, crear_paciente):
    p = crear_paciente(nombre="José Núñez Quispe", notas="Ñandú — áéíóú ¿ok?", antecedente_familiar=None)
    leido = cliente.get(f"/pacientes/{p['id']}", headers=auth).json()
    assert leido["nombre"] == "José Núñez Quispe" and leido["notas"] == "Ñandú — áéíóú ¿ok?"
    assert leido["antecedente_familiar"] is None


def test_listar_y_obtener_pacientes(cliente, auth, crear_paciente):
    p = crear_paciente(nombre="Para Listar")
    assert any(x["id"] == p["id"] for x in cliente.get("/pacientes", headers=auth).json())
    assert cliente.get(f"/pacientes/{p['id']}", headers=auth).status_code == 200
    assert cliente.get("/pacientes/999999", headers=auth).status_code == 404


# ============================================================== escenarios
PARAMS = {"reduccion_kcal_dia": 300, "ejercicio_dias": 4, "ejercicio_minutos": 40, "ejercicio_intensidad": "moderada", "inicio_anio": 1, "duracion_anios": 3}


def test_crud_de_escenarios(cliente, auth, crear_paciente):
    pid = crear_paciente()["id"]
    base = f"/pacientes/{pid}/escenarios"
    fijo = cliente.post(base, json={"nombre": "Sin cambios", "nivel_intervencion": "nula"}, headers=auth)
    pers = cliente.post(base, json={"nombre": "Bici", "nivel_intervencion": "personalizada", "parametros": PARAMS}, headers=auth)
    assert fijo.status_code == pers.status_code == 201
    assert fijo.json()["parametros"] is None and pers.json()["parametros"]["ejercicio_dias"] == 4

    edit = cliente.put(f"{base}/{pers.json()['id']}", headers=auth,
                       json={"nombre": "Bici editada", "nivel_intervencion": "personalizada", "parametros": {**PARAMS, "reduccion_kcal_dia": 350}})
    assert edit.status_code == 200 and edit.json()["nombre"] == "Bici editada"
    guardados = {e["id"]: e for e in cliente.get(base, headers=auth).json()}
    assert guardados[pers.json()["id"]]["parametros"]["reduccion_kcal_dia"] == 350

    assert cliente.delete(f"{base}/{fijo.json()['id']}", headers=auth).status_code == 204
    assert cliente.delete(f"{base}/{fijo.json()['id']}", headers=auth).status_code == 404
    assert len(cliente.get(base, headers=auth).json()) == 1


@pytest.mark.parametrize("cambio", [
    {"ejercicio_dias": 8}, {"ejercicio_minutos": 181}, {"reduccion_kcal_dia": 1001}, {"reduccion_kcal_dia": -1},
    {"inicio_anio": 20}, {"duracion_anios": 0}, {"ejercicio_intensidad": "extrema"},
])
def test_escenario_valida_los_parametros(cliente, auth, crear_paciente, cambio):
    pid = crear_paciente()["id"]
    r = cliente.post(f"/pacientes/{pid}/escenarios", headers=auth,
                     json={"nombre": "X", "nivel_intervencion": "personalizada", "parametros": {**PARAMS, **cambio}})
    assert r.status_code == 422


def test_escenario_exige_nombre_y_paciente_existente(cliente, auth, crear_paciente):
    pid = crear_paciente()["id"]
    assert cliente.post(f"/pacientes/{pid}/escenarios", json={"nombre": "", "nivel_intervencion": "nula"}, headers=auth).status_code == 422
    assert cliente.post("/pacientes/999999/escenarios", json={"nombre": "X", "nivel_intervencion": "nula"}, headers=auth).status_code == 404


def test_no_se_puede_borrar_el_escenario_de_otro_paciente(cliente, auth, crear_paciente):
    a, b = crear_paciente()["id"], crear_paciente()["id"]
    esc = cliente.post(f"/pacientes/{a}/escenarios", json={"nombre": "A", "nivel_intervencion": "nula"}, headers=auth).json()
    assert cliente.delete(f"/pacientes/{b}/escenarios/{esc['id']}", headers=auth).status_code == 404


# ============================================================== simulación e historial
def _con_escenarios(cliente, auth, pid, *definiciones):
    ids = []
    for d in definiciones:
        r = cliente.post(f"/pacientes/{pid}/escenarios", json=d, headers=auth)
        assert r.status_code == 201
        ids.append(r.json()["id"])
    return ids


NULA = {"nombre": "Sin cambios", "nivel_intervencion": "nula"}
MODERADA = {"nombre": "Moderada", "nivel_intervencion": "moderada"}
PERSONAL = {"nombre": "Bici", "nivel_intervencion": "personalizada", "parametros": PARAMS}


def test_simular_sin_escenarios_da_400(cliente, auth, crear_paciente):
    pid = crear_paciente()["id"]
    assert cliente.post(f"/pacientes/{pid}/simular", json={}, headers=auth).status_code == 400


@pytest.mark.parametrize("cuerpo", [{"horizonte_anios": 0}, {"horizonte_anios": 21}, {"trayectorias": 49}, {"trayectorias": 1001}])
def test_simular_valida_el_horizonte_y_las_trayectorias(cliente, auth, crear_paciente, cuerpo):
    pid = crear_paciente()["id"]
    _con_escenarios(cliente, auth, pid, NULA)
    assert cliente.post(f"/pacientes/{pid}/simular", json=cuerpo, headers=auth).status_code == 422


def test_simular_paciente_inexistente(cliente, auth):
    assert cliente.post("/pacientes/999999/simular", json={}, headers=auth).status_code == 404


def test_simulacion_completa_estructura_e_invariantes(cliente, auth, crear_paciente):
    p = crear_paciente(glucosa=104, insulina=13, hba1c=5.8, imc=29, peso=None, talla=None)
    _con_escenarios(cliente, auth, p["id"], NULA, MODERADA, PERSONAL)
    r = cliente.post(f"/pacientes/{p['id']}/simular", json={"horizonte_anios": 5, "trayectorias": 100}, headers=auth)
    assert r.status_code == 200
    s = r.json()
    assert [x["nombre"] for x in s["resultados"]] == ["Sin cambios", "Moderada", "Bici"]
    assert s["horizonteAnios"] == 5 and s["trayectorias"] == 100 and s["runId"]
    assert {v["simbolo"] for v in s["supuestos"]["variablesAleatorias"]} == {"E_cal", "G_act", "T_β", "P_gen"}
    for res in s["resultados"]:
        assert len(res["resumenAnual"]) == 6
        assert res["resumenAnual"][0]["glucosa"]["p50"] == 104        # año 0 = laboratorio real
        assert 0 <= res["prob5"] <= res["probHorizonte"] <= 100
        for punto in res["resumenAnual"]:
            assert punto["glucosa"]["p10"] <= punto["glucosa"]["p50"] <= punto["glucosa"]["p90"]
            assert sum(punto["etapaPct"].values()) == pytest.approx(100, abs=0.6)
    personal = s["resultados"][2]
    assert personal["parametros"]["ejercicio_dias"] == 4
    assert personal["intervencion"]["gActSemana"] > 0                  # el ejercicio se tradujo a kcal con el peso estimado
    assert personal["intervencion"]["pesoEstimado"] is True


def test_simular_solo_los_escenarios_pedidos(cliente, auth, crear_paciente):
    pid = crear_paciente()["id"]
    ids = _con_escenarios(cliente, auth, pid, NULA, MODERADA)
    r = cliente.post(f"/pacientes/{pid}/simular", json={"horizonte_anios": 2, "trayectorias": 50, "escenario_ids": [ids[1]]}, headers=auth)
    assert [x["nombre"] for x in r.json()["resultados"]] == ["Moderada"]


def test_usa_el_peso_registrado_y_no_el_estimado(cliente, auth, crear_paciente):
    pid = crear_paciente(peso=90, talla=170)["id"]
    _con_escenarios(cliente, auth, pid, PERSONAL)
    r = cliente.post(f"/pacientes/{pid}/simular", json={"horizonte_anios": 2, "trayectorias": 50}, headers=auth).json()
    interv = r["resultados"][0]["intervencion"]
    assert interv["pesoUsado"] == 90 and interv["pesoEstimado"] is False


def test_historial_guarda_y_recupera_las_corridas(cliente, auth, crear_paciente):
    pid = crear_paciente()["id"]
    _con_escenarios(cliente, auth, pid, NULA, MODERADA)
    r1 = cliente.post(f"/pacientes/{pid}/simular", json={"horizonte_anios": 3, "trayectorias": 50}, headers=auth).json()
    r2 = cliente.post(f"/pacientes/{pid}/simular", json={"horizonte_anios": 4, "trayectorias": 60}, headers=auth).json()

    historial = cliente.get(f"/pacientes/{pid}/simulaciones", headers=auth).json()
    assert [h["id"] for h in historial] == [r2["runId"], r1["runId"]]          # la más reciente primero
    assert historial[0]["nombresEscenarios"] == ["Sin cambios", "Moderada"]

    guardada = cliente.get(f"/pacientes/{pid}/simulaciones/{r1['runId']}", headers=auth).json()
    assert guardada["horizonteAnios"] == 3
    assert [x["prob5"] for x in guardada["resultados"]] == [x["prob5"] for x in r1["resultados"]]
    assert cliente.get(f"/pacientes/{pid}/simulaciones/999999", headers=auth).status_code == 404


def test_la_corrida_guardada_no_cambia_si_se_borra_el_escenario(cliente, auth, crear_paciente):
    pid = crear_paciente()["id"]
    ids = _con_escenarios(cliente, auth, pid, NULA)
    run = cliente.post(f"/pacientes/{pid}/simular", json={"horizonte_anios": 2, "trayectorias": 50}, headers=auth).json()["runId"]
    cliente.delete(f"/pacientes/{pid}/escenarios/{ids[0]}", headers=auth)
    assert cliente.get(f"/pacientes/{pid}/simulaciones/{run}", headers=auth).json()["resultados"][0]["nombre"] == "Sin cambios"


def test_escenario_sin_parametros_de_una_corrida_antigua_sigue_leyendose(cliente, auth, crear_paciente):
    """Compatibilidad: las corridas guardadas antes de los escenarios configurables no tienen `parametros`."""
    from app.database import SessionLocal
    from app.models import SimulationRun

    pid = crear_paciente()["id"]
    _con_escenarios(cliente, auth, pid, NULA)
    run = cliente.post(f"/pacientes/{pid}/simular", json={"horizonte_anios": 2, "trayectorias": 50}, headers=auth).json()["runId"]
    with SessionLocal() as db:
        corrida = db.get(SimulationRun, run)
        corrida.resultados = [{k: v for k, v in r.items() if k not in ("parametros", "intervencion")} for r in corrida.resultados]
        db.commit()
    assert cliente.get(f"/pacientes/{pid}/simulaciones/{run}", headers=auth).status_code == 200


# ============================================================== priorización de riesgo
def test_riesgo_ordena_por_probabilidad_y_deja_al_final_a_los_no_simulados(cliente, auth, crear_paciente):
    sano = crear_paciente(nombre="R-Sano", edad=28, imc=22.5, peso=60, talla=163, glucosa=82, insulina=5, hba1c=5.0)
    riesgoso = crear_paciente(nombre="R-Riesgo", glucosa=112, insulina=18, hba1c=6.0, imc=33)
    nuevo = crear_paciente(nombre="R-SinSimular")
    for p in (sano, riesgoso):
        _con_escenarios(cliente, auth, p["id"], NULA)
        cliente.post(f"/pacientes/{p['id']}/simular", json={"horizonte_anios": 5, "trayectorias": 50}, headers=auth)

    filas = cliente.get("/pacientes/riesgo", headers=auth).json()
    orden = [f["nombre"] for f in filas if f["nombre"].startswith("R-")]
    assert orden == ["R-Riesgo", "R-Sano", "R-SinSimular"]
    por_nombre = {f["nombre"]: f for f in filas}
    assert por_nombre["R-Riesgo"]["ultimaSimulacion"]["prob5"] > por_nombre["R-Sano"]["ultimaSimulacion"]["prob5"]
    assert por_nombre["R-SinSimular"]["ultimaSimulacion"] is None and nuevo["id"] == por_nombre["R-SinSimular"]["id"]
