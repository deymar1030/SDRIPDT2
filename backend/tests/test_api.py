"""API completa: autenticación, seguridad, pacientes, escenarios, simulación,
historial y priorización de riesgo."""

import datetime as dt

import jwt
import pytest

from tests.conftest import PACIENTE_BASE, cabeceras

from app.config import settings

# ============================================================== autenticación
def _login(cliente, correo, password):
    return cliente.post("/auth/login", data={"username": correo, "password": password})


def test_salud(cliente):
    assert cliente.get("/salud").json() == {"estado": "ok"}


def test_no_existe_el_registro_publico(cliente):
    r = cliente.post("/auth/registro", json={"nombre": "Intruso", "correo": "intruso@x.bo", "password": "secreto123", "rol": "admin"})
    assert r.status_code in (404, 405)
    assert _login(cliente, "intruso@x.bo", "secreto123").status_code == 401        # no se creó ninguna cuenta


def test_login_correcto_y_correo_en_mayusculas(cliente, auth):
    assert _login(cliente, "doctora@prueba.bo", "clave-prueba").status_code == 200
    assert _login(cliente, "DOCTORA@Prueba.BO", "clave-prueba").status_code == 200


def test_login_con_clave_o_usuario_incorrectos(cliente, auth):
    assert _login(cliente, "doctora@prueba.bo", "mala").status_code == 401
    assert _login(cliente, "nadie@prueba.bo", "clave-prueba").status_code == 401


def test_yo_devuelve_el_usuario_de_la_sesion(cliente, auth):
    r = cliente.get("/auth/yo", headers=auth)
    u = r.json()
    assert r.status_code == 200 and u["correo"] == "doctora@prueba.bo" and u["rol"] == "medico" and u["activo"] is True
    assert "password_hash" not in u and "password" not in u


def test_editar_perfil(cliente, crear_cuenta):
    crear_cuenta("Perfil", "perfil@prueba.bo", "secreto123")
    h = cabeceras(cliente, "perfil@prueba.bo", "secreto123")
    r = cliente.patch("/auth/perfil", json={"nombre": "Perfil Nuevo", "correo": "Perfil.Nuevo@prueba.bo"}, headers=h)
    assert r.status_code == 200 and r.json()["nombre"] == "Perfil Nuevo" and r.json()["correo"] == "perfil.nuevo@prueba.bo"


def test_editar_perfil_no_permite_tomar_el_correo_de_otro(cliente, auth, crear_cuenta):
    crear_cuenta("Beto Perfil", "beto.perfil@hospital.bo", "secreto123")
    r = cliente.patch("/auth/perfil", json={"nombre": "Doctora", "correo": "beto.perfil@hospital.bo"}, headers=auth)
    assert r.status_code == 400


def test_cambiar_contrasena(cliente, crear_cuenta):
    crear_cuenta("Clave", "clave@prueba.bo", "vieja-clave")
    h = cabeceras(cliente, "clave@prueba.bo", "vieja-clave")
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
    ("GET", "/usuarios"), ("POST", "/usuarios"), ("PATCH", "/usuarios/1"),
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


# ============================================================== administración de cuentas y roles
def test_el_admin_crea_cuentas_y_el_correo_se_normaliza(crear_cuenta):
    r = crear_cuenta("Ana Pérez", "Ana.Perez@Hospital.BO", "secreto123", "medico")
    u = r.json()
    assert r.status_code == 201 and u["correo"] == "ana.perez@hospital.bo" and u["rol"] == "medico" and u["activo"] is True
    assert "password" not in u and "password_hash" not in u


def test_correo_duplicado_sin_importar_mayusculas(crear_cuenta):
    assert crear_cuenta("Beto", "beto@hospital.bo").status_code == 201
    assert crear_cuenta("Otro", "BETO@hospital.bo").status_code == 400


@pytest.mark.parametrize("cuerpo", [
    {"nombre": "X", "correo": "no-es-correo", "password": "secreto123"},
    {"nombre": "X", "correo": "x@y.bo", "password": "123"},                          # contraseña demasiado corta
    {"nombre": "X", "correo": "x@y.bo"},                                              # falta la contraseña
    {"nombre": "", "correo": "x@y.bo", "password": "secreto123"},                    # nombre vacío
    {"nombre": "X", "correo": "x@y.bo", "password": "secreto123", "rol": "paciente"},     # los pacientes no son usuarios
    {"nombre": "X", "correo": "x@y.bo", "password": "secreto123", "rol": "investigador"},  # roles retirados
])
def test_crear_cuenta_valida_los_datos(cliente, admin_auth, cuerpo):
    assert cliente.post("/usuarios", json=cuerpo, headers=admin_auth).status_code == 422


def test_el_admin_lista_las_cuentas(cliente, admin_auth, auth):
    filas = cliente.get("/usuarios", headers=admin_auth).json()
    correos = {f["correo"]: f for f in filas}
    assert correos["admin@prueba.bo"]["rol"] == "admin" and correos["doctora@prueba.bo"]["rol"] == "medico"
    assert all("password_hash" not in f for f in filas)


def test_un_medico_no_puede_administrar_cuentas(cliente, auth):
    assert cliente.get("/usuarios", headers=auth).status_code == 403
    assert cliente.post("/usuarios", json={"nombre": "X", "correo": "x@y.bo", "password": "secreto123", "rol": "admin"}, headers=auth).status_code == 403
    assert cliente.patch("/usuarios/1", json={"rol": "admin"}, headers=auth).status_code == 403


def test_el_admin_no_ve_datos_de_pacientes(cliente, admin_auth, crear_paciente):
    p = crear_paciente(nombre="Reservado al médico")
    base = f"/pacientes/{p['id']}"
    intentos = [
        ("GET", "/pacientes", None), ("GET", "/pacientes/riesgo", None), ("POST", "/pacientes", PACIENTE_BASE),
        ("GET", base, None), ("GET", base + "/escenarios", None), ("POST", base + "/escenarios", {"nombre": "X", "nivel_intervencion": "nula"}),
        ("POST", base + "/simular", {}), ("GET", base + "/simulaciones", None), ("GET", base + "/simulaciones/1", None),
    ]
    for metodo, ruta, cuerpo in intentos:
        assert cliente.request(metodo, ruta, json=cuerpo, headers=admin_auth).status_code == 403, (metodo, ruta)


def test_cada_medico_ve_solo_sus_pacientes(cliente, auth, crear_paciente, crear_cuenta):
    mio = crear_paciente(nombre="Paciente de la doctora")
    esc = cliente.post(f"/pacientes/{mio['id']}/escenarios", json={"nombre": "Sin cambios", "nivel_intervencion": "nula"}, headers=auth).json()
    run = cliente.post(f"/pacientes/{mio['id']}/simular", json={"horizonte_anios": 2, "trayectorias": 50}, headers=auth).json()["runId"]

    crear_cuenta("Dr. Otro", "otro.medico@prueba.bo", "clave-otro")
    otro = cabeceras(cliente, "otro.medico@prueba.bo", "clave-otro")

    assert mio["id"] not in [p["id"] for p in cliente.get("/pacientes", headers=otro).json()]
    assert mio["id"] not in [f["id"] for f in cliente.get("/pacientes/riesgo", headers=otro).json()]
    base = f"/pacientes/{mio['id']}"
    ajenos = [
        ("GET", base, None), ("GET", base + "/escenarios", None), ("POST", base + "/escenarios", {"nombre": "X", "nivel_intervencion": "nula"}),
        ("PUT", f"{base}/escenarios/{esc['id']}", {"nombre": "Y", "nivel_intervencion": "nula"}), ("DELETE", f"{base}/escenarios/{esc['id']}", None),
        ("POST", base + "/simular", {}), ("GET", base + "/simulaciones", None), ("GET", f"{base}/simulaciones/{run}", None),
    ]
    for metodo, ruta, cuerpo in ajenos:
        # 404 y no 403: no se revela que ese paciente existe
        assert cliente.request(metodo, ruta, json=cuerpo, headers=otro).status_code == 404, (metodo, ruta)
    # sigue intacto para su dueña
    assert cliente.get(base, headers=auth).status_code == 200
    assert cliente.get(f"{base}/simulaciones/{run}", headers=auth).status_code == 200

    # y a la inversa: lo que registra el otro médico no lo ve ella
    suyo = cliente.post("/pacientes", json={**PACIENTE_BASE, "nombre": "Paciente del otro"}, headers=otro)
    assert suyo.status_code == 201
    assert cliente.get(f"/pacientes/{suyo.json()['id']}", headers=auth).status_code == 404


def test_cambiar_rol_y_restablecer_contrasena(cliente, admin_auth, crear_cuenta):
    u = crear_cuenta("Cambio", "cambio@prueba.bo", "clave-vieja", "medico").json()
    r = cliente.patch(f"/usuarios/{u['id']}", json={"password": "clave-nueva", "nombre": "Cambio Nuevo"}, headers=admin_auth)
    assert r.status_code == 200 and r.json()["nombre"] == "Cambio Nuevo"
    assert _login(cliente, "cambio@prueba.bo", "clave-vieja").status_code == 401
    assert _login(cliente, "cambio@prueba.bo", "clave-nueva").status_code == 200

    # al pasar a admin gana /usuarios y pierde los pacientes
    assert cliente.patch(f"/usuarios/{u['id']}", json={"rol": "admin"}, headers=admin_auth).status_code == 200
    h = cabeceras(cliente, "cambio@prueba.bo", "clave-nueva")
    assert cliente.get("/usuarios", headers=h).status_code == 200
    assert cliente.get("/pacientes", headers=h).status_code == 403


def test_el_admin_no_puede_tomar_el_correo_de_otra_cuenta_ni_editar_una_inexistente(cliente, admin_auth, crear_cuenta):
    a = crear_cuenta("Uno", "uno@prueba.bo").json()
    crear_cuenta("Dos", "dos@prueba.bo")
    assert cliente.patch(f"/usuarios/{a['id']}", json={"correo": "DOS@prueba.bo"}, headers=admin_auth).status_code == 400
    assert cliente.patch("/usuarios/999999", json={"nombre": "X"}, headers=admin_auth).status_code == 404


def test_cuenta_desactivada_no_entra_y_su_token_deja_de_valer(cliente, admin_auth, crear_cuenta):
    u = crear_cuenta("Baja", "baja@prueba.bo", "clave-baja").json()
    h = cabeceras(cliente, "baja@prueba.bo", "clave-baja")
    assert cliente.get("/auth/yo", headers=h).status_code == 200

    assert cliente.patch(f"/usuarios/{u['id']}", json={"activo": False}, headers=admin_auth).json()["activo"] is False
    assert cliente.get("/auth/yo", headers=h).status_code == 401                       # token vigente, pero cuenta inactiva
    r = _login(cliente, "baja@prueba.bo", "clave-baja")
    assert r.status_code == 403 and "desactivada" in r.json()["detail"]
    assert _login(cliente, "baja@prueba.bo", "clave-equivocada").status_code == 401    # con clave mala no revela el estado

    assert cliente.patch(f"/usuarios/{u['id']}", json={"activo": True}, headers=admin_auth).status_code == 200
    assert _login(cliente, "baja@prueba.bo", "clave-baja").status_code == 200


def test_el_admin_no_puede_quedarse_sin_acceso(cliente, admin_auth, crear_cuenta):
    yo = cliente.get("/auth/yo", headers=admin_auth).json()
    assert cliente.patch(f"/usuarios/{yo['id']}", json={"activo": False}, headers=admin_auth).status_code == 400
    assert cliente.patch(f"/usuarios/{yo['id']}", json={"rol": "medico"}, headers=admin_auth).status_code == 400
    assert cliente.get("/auth/yo", headers=admin_auth).json()["rol"] == "admin"          # sigue siendo admin

    # otro admin sí puede desactivar al primero (queda él); luego lo reactiva para no afectar otras pruebas
    crear_cuenta("Admin 2", "admin2@prueba.bo", "clave-admin2", "admin")
    h2 = cabeceras(cliente, "admin2@prueba.bo", "clave-admin2")
    assert cliente.patch(f"/usuarios/{yo['id']}", json={"activo": False}, headers=h2).status_code == 200
    assert cliente.get("/auth/yo", headers=admin_auth).status_code == 401
    assert cliente.patch(f"/usuarios/{yo['id']}", json={"activo": True}, headers=h2).status_code == 200
    assert cliente.get("/auth/yo", headers=admin_auth).status_code == 200
