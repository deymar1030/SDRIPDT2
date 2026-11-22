import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..motor import calcular_supuestos, sensibilidad_inicial, simular_escenarios, tasa_desgaste_adiposo
from ..motor.escenarios import resolver_cambio
from ..motor.paciente import PerfilClinico, calcular_imc
from ..security import requiere_medico

router = APIRouter(prefix="/pacientes", tags=["pacientes"])


def _a_patient_out(p: models.Patient) -> schemas.PatientOut:
    return schemas.PatientOut(
        id=p.id, nombre=p.nombre, edad=p.edad, imc=p.imc, sedentarismo=p.sedentarismo,
        antecedente_familiar=p.antecedente_familiar, notas=p.notas, creado_en=p.creado_en,
        estadoLatente=schemas.EstadoPaciente(
            sI0=round(sensibilidad_inicial(p.imc), 3), kVat=round(tasa_desgaste_adiposo(p.sedentarismo, p.imc), 5),
        ),
    )


def _obtener_paciente_o_404(paciente_id: int, db: Session, usuario: models.User) -> models.Patient:
    """Cada médico accede solo a los pacientes que registró él. Si el paciente es de
    otro médico se responde 404 (no 403) para no revelar que existe."""
    paciente = db.get(models.Patient, paciente_id)
    if paciente is None or paciente.creado_por_id != usuario.id:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente


@router.get("", response_model=list[schemas.PatientOut])
def listar_pacientes(db: Session = Depends(get_db), usuario: models.User = Depends(requiere_medico)):
    pacientes = (
        db.query(models.Patient)
        .filter(models.Patient.creado_por_id == usuario.id)
        .order_by(models.Patient.creado_en.desc())
        .all()
    )
    return [_a_patient_out(p) for p in pacientes]


@router.get("/riesgo", response_model=list[schemas.PacienteRiesgo])
def listar_pacientes_riesgo(db: Session = Depends(get_db), usuario: models.User = Depends(requiere_medico)):
    """Todos los pacientes ordenados por probabilidad de diabetes a 5 años
    (según su última simulación del escenario 'sin cambios', si existe),
    para priorizar a quién contactar primero."""
    pacientes = db.query(models.Patient).filter(models.Patient.creado_por_id == usuario.id).all()
    filas: list[schemas.PacienteRiesgo] = []
    for p in pacientes:
        ultima = (
            db.query(models.SimulationRun)
            .filter(models.SimulationRun.paciente_id == p.id)
            .order_by(models.SimulationRun.creado_en.desc())
            .first()
        )
        resumen = None
        if ultima and ultima.resultados:
            esc = next((r for r in ultima.resultados if r.get("nivelIntervencion") == "nula"), ultima.resultados[0])
            resumen = schemas.UltimaSimulacionResumen(
                prob5=esc["prob5"], probHorizonte=esc["probHorizonte"],
                etapaMediana=esc["etapaMediana"], creadoEn=ultima.creado_en,
            )
        filas.append(schemas.PacienteRiesgo(
            id=p.id, nombre=p.nombre, edad=p.edad, imc=p.imc, sedentarismo=p.sedentarismo, ultimaSimulacion=resumen,
        ))

    filas.sort(key=lambda f: f.ultimaSimulacion.prob5 if f.ultimaSimulacion else -1, reverse=True)
    return filas


@router.post("", response_model=schemas.PatientOut, status_code=201)
def crear_paciente(
    datos: schemas.PatientCreate,
    db: Session = Depends(get_db),
    usuario: models.User = Depends(requiere_medico),
):
    imc = calcular_imc(datos.peso, datos.talla)
    if not 12 <= imc <= 70:
        raise HTTPException(status_code=422, detail=f"El IMC calculado ({imc}) queda fuera del rango de 12 a 70; revisa el peso y la talla.")
    paciente = models.Patient(**datos.model_dump(exclude={"peso", "talla"}), imc=imc, creado_por_id=usuario.id)
    db.add(paciente)
    db.commit()
    db.refresh(paciente)
    return _a_patient_out(paciente)


@router.get("/{paciente_id}", response_model=schemas.PatientOut)
def obtener_paciente(paciente_id: int, db: Session = Depends(get_db), usuario: models.User = Depends(requiere_medico)):
    return _a_patient_out(_obtener_paciente_o_404(paciente_id, db, usuario))


@router.get("/{paciente_id}/escenarios", response_model=list[schemas.ScenarioOut])
def listar_escenarios(paciente_id: int, db: Session = Depends(get_db), usuario: models.User = Depends(requiere_medico)):
    _obtener_paciente_o_404(paciente_id, db, usuario)
    return (
        db.query(models.Scenario)
        .filter(models.Scenario.paciente_id == paciente_id)
        .order_by(models.Scenario.creado_en.asc())
        .all()
    )


@router.post("/{paciente_id}/escenarios", response_model=schemas.ScenarioOut, status_code=201)
def crear_escenario(
    paciente_id: int,
    datos: schemas.ScenarioCreate,
    db: Session = Depends(get_db),
    usuario: models.User = Depends(requiere_medico),
):
    _obtener_paciente_o_404(paciente_id, db, usuario)
    escenario = models.Scenario(paciente_id=paciente_id, **datos.model_dump())
    db.add(escenario)
    db.commit()
    db.refresh(escenario)
    return escenario


@router.put("/{paciente_id}/escenarios/{escenario_id}", response_model=schemas.ScenarioOut)
def actualizar_escenario(
    paciente_id: int,
    escenario_id: int,
    datos: schemas.ScenarioCreate,
    db: Session = Depends(get_db),
    usuario: models.User = Depends(requiere_medico),
):
    _obtener_paciente_o_404(paciente_id, db, usuario)
    escenario = db.get(models.Scenario, escenario_id)
    if escenario is None or escenario.paciente_id != paciente_id:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")
    escenario.nombre = datos.nombre
    escenario.nivel_intervencion = datos.nivel_intervencion
    escenario.parametros = datos.parametros.model_dump() if datos.parametros else None
    db.commit()
    db.refresh(escenario)
    return escenario


@router.delete("/{paciente_id}/escenarios/{escenario_id}", status_code=204)
def eliminar_escenario(
    paciente_id: int,
    escenario_id: int,
    db: Session = Depends(get_db),
    usuario: models.User = Depends(requiere_medico),
):
    _obtener_paciente_o_404(paciente_id, db, usuario)
    escenario = db.get(models.Scenario, escenario_id)
    if escenario is None or escenario.paciente_id != paciente_id:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")
    db.delete(escenario)
    db.commit()
    return None


@router.post("/{paciente_id}/simular", response_model=schemas.SimulateResponse)
def simular(
    paciente_id: int,
    datos: schemas.SimulateRequest,
    db: Session = Depends(get_db),
    usuario: models.User = Depends(requiere_medico),
):
    paciente = _obtener_paciente_o_404(paciente_id, db, usuario)

    query = db.query(models.Scenario).filter(models.Scenario.paciente_id == paciente_id)
    if datos.escenario_ids:
        query = query.filter(models.Scenario.id.in_(datos.escenario_ids))
    escenarios = query.order_by(models.Scenario.creado_en.asc()).all()
    if not escenarios:
        raise HTTPException(status_code=400, detail="El paciente no tiene escenarios para simular")

    perfil = PerfilClinico(paciente.edad, paciente.imc, paciente.sedentarismo, paciente.antecedente_familiar)
    semilla = datos.semilla if datos.semilla is not None else secrets.randbelow(2**32)

    salidas = simular_escenarios(
        edad=paciente.edad,
        imc=paciente.imc,
        sedentarismo=paciente.sedentarismo,
        antecedente_familiar=paciente.antecedente_familiar,
        horizonte_anios=datos.horizonte_anios,
        trayectorias=datos.trayectorias,
        cambios=[resolver_cambio(esc.nivel_intervencion, esc.parametros, perfil) for esc in escenarios],
        semilla=semilla,
    )
    resultados_dicts = [
        {"escenarioId": esc.id, "nombre": esc.nombre, "nivelIntervencion": esc.nivel_intervencion, "parametros": esc.parametros, **salida}
        for esc, salida in zip(escenarios, salidas)
    ]

    supuestos = {
        **calcular_supuestos(paciente.edad, paciente.imc, paciente.sedentarismo, paciente.antecedente_familiar),
        "semilla": semilla,
    }

    corrida = models.SimulationRun(
        paciente_id=paciente_id,
        horizonte_anios=datos.horizonte_anios,
        trayectorias=datos.trayectorias,
        resultados=resultados_dicts,
        supuestos=supuestos,
    )
    db.add(corrida)
    db.commit()
    db.refresh(corrida)

    return schemas.SimulateResponse(
        runId=corrida.id,
        creadoEn=corrida.creado_en,
        pacienteId=paciente_id,
        horizonteAnios=datos.horizonte_anios,
        trayectorias=datos.trayectorias,
        semilla=semilla,
        resultados=[schemas.ResultadoEscenario(**r) for r in resultados_dicts],
        supuestos=schemas.Supuestos(**supuestos),
    )


@router.get("/{paciente_id}/simulaciones", response_model=list[schemas.SimulationRunSummary])
def listar_simulaciones(paciente_id: int, db: Session = Depends(get_db), usuario: models.User = Depends(requiere_medico)):
    _obtener_paciente_o_404(paciente_id, db, usuario)
    corridas = (
        db.query(models.SimulationRun)
        .filter(models.SimulationRun.paciente_id == paciente_id)
        .order_by(models.SimulationRun.creado_en.desc())
        .all()
    )
    return [
        schemas.SimulationRunSummary(
            id=c.id, creado_en=c.creado_en, horizonte_anios=c.horizonte_anios, trayectorias=c.trayectorias,
            nombresEscenarios=[r["nombre"] for r in c.resultados],
        )
        for c in corridas
    ]


@router.get("/{paciente_id}/simulaciones/{run_id}", response_model=schemas.SimulateResponse)
def obtener_simulacion(paciente_id: int, run_id: int, db: Session = Depends(get_db), usuario: models.User = Depends(requiere_medico)):
    _obtener_paciente_o_404(paciente_id, db, usuario)
    corrida = db.get(models.SimulationRun, run_id)
    if corrida is None or corrida.paciente_id != paciente_id:
        raise HTTPException(status_code=404, detail="Simulación no encontrada")
    return schemas.SimulateResponse(
        runId=corrida.id,
        creadoEn=corrida.creado_en,
        pacienteId=paciente_id,
        horizonteAnios=corrida.horizonte_anios,
        trayectorias=corrida.trayectorias,
        semilla=corrida.supuestos.get("semilla", 0),
        resultados=[schemas.ResultadoEscenario(**r) for r in corrida.resultados],
        supuestos=schemas.Supuestos(**corrida.supuestos),
    )
