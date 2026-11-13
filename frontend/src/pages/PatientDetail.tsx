import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, FlaskConical, History } from "lucide-react";
import { Shell } from "../components/Shell";
import { StageBadge } from "../components/StageBadge";
import { PanelAnatomico, estadoDesdePaciente } from "../components/PanelAnatomico";
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

  const antecedente =
    paciente.antecedente_familiar == null ? "Antecedente familiar: sin dato" : paciente.antecedente_familiar ? "Antecedente familiar de DMT2" : "Sin antecedente familiar";

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
                  {paciente.sexo && <Chip>{paciente.sexo}</Chip>}
                  <Chip>IMC {paciente.imc}</Chip>
                  <Chip alerta={paciente.antecedente_familiar === true}>{antecedente}</Chip>
                  {paciente.hipertension && <Chip alerta>Hipertensión</Chip>}
                  {paciente.tabaquismo && <Chip alerta>Tabaquismo</Chip>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StageBadge etapa={paciente.etapaActual} className="px-3 py-1 text-sm" />
              <BotonEnlace to={`/simulador?id=${paciente.id}`} icono={<FlaskConical size={16} />}>Simular pronóstico</BotonEnlace>
            </div>
          </div>
        </Panel>

        <PanelAnatomico estado={estadoDesdePaciente(paciente)} momento="Hoy">
          <p className="text-xs text-sky-200/60">
            Laboratorio medido hoy. Reserva β, sensibilidad y grasa acumulada son estimaciones del modelo a partir de esos
            valores (HOMA-IR = glucosa × insulina ÷ 405).
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
