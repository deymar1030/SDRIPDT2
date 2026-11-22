import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Shell } from "../components/Shell";
import { SedentarismoBadge } from "../components/SedentarismoBadge";
import { PanelAnatomico, estadoDesdePaciente } from "../components/PanelAnatomico";
import { textoAntecedente } from "../lib/perfil";
import { Aviso, BotonEnlace, Cargando, Panel } from "../components/ui";
import { api } from "../api/client";
import type { Paciente, SimulationRunSummary } from "../types";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PatientDetail() {
  const { id } = useParams();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [simulaciones, setSimulaciones] = useState<SimulationRunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.obtenerPaciente(Number(id)).then(setPaciente).catch((e) => setError(e.message));
    api.listarSimulaciones(Number(id)).then(setSimulaciones).catch(() => setSimulaciones([]));
  }, [id]);

  if (error) return <Shell titulo="Ficha de paciente"><Aviso tipo="error">{error}</Aviso></Shell>;
  if (!paciente) return <Shell titulo="Ficha de paciente"><Cargando /></Shell>;

  return (
    <Shell titulo={paciente.nombre}>
      <div className="-mt-5 mb-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div className="cifras flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-hud-suave">
          <span>{paciente.edad} años</span>
          <span>IMC {paciente.imc}</span>
          <SedentarismoBadge nivel={paciente.sedentarismo} />
          <span>{textoAntecedente(paciente.antecedente_familiar)}</span>
        </div>
        <div className="flex gap-3">
          <BotonEnlace to="/pacientes" variante="secundario">Volver a pacientes</BotonEnlace>
          <BotonEnlace to={`/simulador?id=${paciente.id}`}>Simular pronóstico</BotonEnlace>
        </div>
      </div>

      <div className="space-y-12">
        <PanelAnatomico estado={estadoDesdePaciente(paciente)} momento="Estado inicial del modelo">
          <p className="text-sm text-hud-suave">
            Todo paciente parte de la homeostasis ideal del modelo (glucosa 90 mg/dL, insulina 10 µU/mL, masa beta 100 %). Su sensibilidad inicial S_I0 y su tasa de
            desgaste adiposo k_VAT salen del IMC y el sedentarismo.
          </p>
        </PanelAnatomico>

        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
          <Panel titulo="Notas clínicas">
            <p className="leading-relaxed text-hud-texto">{paciente.notas || <span className="text-hud-tenue">Sin notas registradas.</span>}</p>
          </Panel>

          <Panel titulo="Simulaciones guardadas" acciones={<BotonEnlace to={`/simulador?id=${paciente.id}`} variante="secundario" tamano="sm">Nueva</BotonEnlace>}>
            {!simulaciones ? (
              <Cargando />
            ) : simulaciones.length === 0 ? (
              <p className="text-sm text-hud-tenue">Aún no se simuló el pronóstico de este paciente.</p>
            ) : (
              <ul className="border-t border-hud-borde">
                {simulaciones.slice(0, 4).map((s) => (
                  <li key={s.id} className="border-b border-hud-borde">
                    <Link to={`/simulador?id=${paciente.id}`} title="Abrir el historial en el simulador para compararla" className="block py-3 transition-colors hover:bg-hud-panel-2/60">
                      <p className="cifras text-sm text-white">{formatearFecha(s.creado_en)}</p>
                      <p className="truncate text-xs text-hud-tenue">{s.horizonte_anios} años · {s.nombresEscenarios.join(", ")}</p>
                    </Link>
                  </li>
                ))}
                {simulaciones.length > 4 && <li className="py-2 text-xs text-hud-tenue">y {simulaciones.length - 4} más en el historial del simulador.</li>}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
