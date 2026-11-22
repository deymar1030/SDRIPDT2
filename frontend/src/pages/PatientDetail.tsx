import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, FlaskConical, History } from "lucide-react";
import { Shell } from "../components/Shell";
import { SedentarismoBadge } from "../components/SedentarismoBadge";
import { PanelAnatomico, estadoDesdePaciente } from "../components/PanelAnatomico";
import { textoAntecedente } from "../lib/perfil";
import { Aviso, Avatar, BotonEnlace, Cargando, Panel } from "../components/ui";
import { api } from "../api/client";
import type { Paciente, SimulationRunSummary } from "../types";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Chip({ children, alerta = false }: { children: ReactNode; alerta?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs ${
        alerta ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-hud-borde bg-white/5 text-hud-suave"
      }`}
    >
      {children}
    </span>
  );
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
    <Shell titulo="Ficha de paciente">
      <div className="space-y-5">
        <BotonEnlace to="/pacientes" variante="fantasma" tamano="sm" icono={<ArrowLeft size={14} />}>Pacientes</BotonEnlace>

        <Panel esquinas>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar nombre={paciente.nombre} tamano={56} />
              <div>
                <h2 className="text-xl font-bold text-white">{paciente.nombre}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Chip>{paciente.edad} años</Chip>
                  <Chip>IMC {paciente.imc}</Chip>
                  <SedentarismoBadge nivel={paciente.sedentarismo} />
                  <Chip alerta={paciente.antecedente_familiar === true}>{textoAntecedente(paciente.antecedente_familiar)}</Chip>
                </div>
              </div>
            </div>
            <BotonEnlace to={`/simulador?id=${paciente.id}`} icono={<FlaskConical size={16} />}>Simular pronóstico</BotonEnlace>
          </div>
        </Panel>

        <PanelAnatomico estado={estadoDesdePaciente(paciente)} momento="Estado inicial del modelo">
          <p className="text-xs text-sky-200/60">
            Todo paciente parte de la homeostasis ideal del modelo (glucosa 90 mg/dL, insulina 10 µU/mL, masa beta 100 %). Su
            sensibilidad inicial S_I0 y su tasa de desgaste adiposo k_VAT salen del IMC y el sedentarismo.
          </p>
        </PanelAnatomico>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel titulo="Notas clínicas">
            <p className="text-sm leading-relaxed text-hud-texto">
              {paciente.notas || <span className="text-hud-tenue">Sin notas registradas.</span>}
            </p>
          </Panel>

          <Panel
            titulo="Simulaciones guardadas"
            acciones={<BotonEnlace to={`/simulador?id=${paciente.id}`} variante="secundario" tamano="sm" icono={<FlaskConical size={13} />}>Nueva</BotonEnlace>}
          >
            {!simulaciones ? (
              <Cargando />
            ) : simulaciones.length === 0 ? (
              <p className="text-sm text-hud-tenue">Aún no se simuló el pronóstico de este paciente.</p>
            ) : (
              <ul className="space-y-2">
                {simulaciones.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/simulador?id=${paciente.id}`}
                      title="Abrir el historial en el simulador para compararla"
                      className="group flex items-center gap-3 rounded-lg border border-hud-borde bg-hud-fondo/40 px-3 py-2 transition-colors hover:border-hud-borde-fuerte hover:bg-hud-acento/5"
                    >
                      <History size={15} className="flex-shrink-0 text-hud-acento" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white">{formatearFecha(s.creado_en)}</p>
                        <p className="truncate text-xs text-hud-tenue">{s.horizonte_anios} años · {s.nombresEscenarios.join(", ")}</p>
                      </div>
                      <ChevronRight size={15} className="flex-shrink-0 text-hud-tenue transition-colors group-hover:text-hud-acento" />
                    </Link>
                  </li>
                ))}
                {simulaciones.length > 4 && <p className="text-xs text-hud-tenue">y {simulaciones.length - 4} más en el historial del simulador.</p>}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
