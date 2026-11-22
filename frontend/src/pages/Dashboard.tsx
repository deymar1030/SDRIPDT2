import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle, FlaskConical, Clock, UserPlus, ChevronRight } from "lucide-react";
import { Shell } from "../components/Shell";
import { StatTile } from "../components/StatTile";
import { SedentarismoBadge } from "../components/SedentarismoBadge";
import { Aviso, Avatar, BotonEnlace, Cargando, Panel, Vacio, claseTabla, tinta } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { COLOR_SEDENTARISMO, NOMBRE_SEDENTARISMO, SEDENTARISMO } from "../lib/perfil";
import type { PacienteRiesgo, Sedentarismo } from "../types";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function colorProb(prob: number) {
  if (prob >= 60) return "#f43f5e";
  if (prob >= 30) return "#fb923c";
  if (prob >= 10) return "#facc15";
  return "#3fb98a";
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [riesgo, setRiesgo] = useState<PacienteRiesgo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listarPacientesRiesgo().then(setRiesgo).catch((e) => setError(e.message));
  }, []);

  const resumen = useMemo(() => {
    const lista = riesgo ?? [];
    const porNivel = Object.fromEntries(SEDENTARISMO.map((n) => [n, lista.filter((p) => p.sedentarismo === n).length])) as Record<Sedentarismo, number>;
    return {
      total: lista.length,
      enRiesgo: lista.filter((p) => (p.ultimaSimulacion?.prob5 ?? 0) >= 50).length,
      simulados: lista.filter((p) => p.ultimaSimulacion).length,
      porNivel,
    };
  }, [riesgo]);

  const primerNombre = usuario?.nombre.split(" ")[0] ?? "";

  return (
    <Shell titulo="Panel principal" subtitulo="Resumen de tus pacientes y prioridades">
      <section className="isla-oscura relative mb-6 overflow-hidden rounded-2xl border border-hud-borde-fuerte bg-gradient-to-br from-[#0e2a5c] via-hud-panel to-hud-fondo p-6 sm:p-8">
        <img
          src="/images/dashboard-banner.jpg"
          alt=""
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] object-cover opacity-35 mix-blend-luminosity [mask-image:linear-gradient(to_left,black_40%,transparent)] md:block"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] bg-gradient-to-l from-cyan-500/20 to-transparent md:block" />
        <div className="relative max-w-lg">
          <p className="text-[11px] uppercase tracking-[0.2em] text-sky-300">Hola, {primerNombre || "de nuevo"}</p>
          <h2 className="mt-2 text-2xl font-bold leading-snug text-white sm:text-3xl">
            ¿Qué pasaría si uno de tus pacientes no cambia de hábitos?
          </h2>
          <p className="mt-2 text-sm text-hud-suave">Simula su pronóstico y compáralo con una intervención preventiva.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <BotonEnlace to="/simulador" icono={<FlaskConical size={16} />}>Simular un pronóstico</BotonEnlace>
            <BotonEnlace to="/pacientes/nuevo" variante="secundario" icono={<UserPlus size={16} />}>Registrar paciente</BotonEnlace>
          </div>
        </div>
      </section>

      {error && <div className="mb-4"><Aviso tipo="error">{error}</Aviso></div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile etiqueta="Pacientes" valor={riesgo ? resumen.total : "—"} icono={<Users size={16} />} />
        <StatTile etiqueta="En riesgo" valor={riesgo ? resumen.enRiesgo : "—"} nota="Prob. a 5 años de 50 % o más" icono={<AlertTriangle size={16} />} color="#f43f5e" />
        <StatTile etiqueta="Simulados" valor={riesgo ? resumen.simulados : "—"} nota="Con al menos un pronóstico" icono={<FlaskConical size={16} />} color="#7c8fd6" />
        <StatTile etiqueta="Sin simular" valor={riesgo ? resumen.total - resumen.simulados : "—"} nota="Pendientes de pronóstico" icono={<Clock size={16} />} color="#facc15" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <Panel
          titulo="Pacientes en riesgo"
          descripcion="Ordenados por probabilidad de diabetes a 5 años (escenario sin cambios), para priorizar a quién contactar primero."
          acciones={<BotonEnlace to="/pacientes" variante="fantasma" tamano="sm">Ver todos</BotonEnlace>}
        >
          {!riesgo ? (
            <Cargando />
          ) : riesgo.length === 0 ? (
            <Vacio
              icono={<Users size={20} />}
              titulo="Todavía no hay pacientes"
              descripcion="Registra tu primer paciente para empezar a simular pronósticos."
              accion={<BotonEnlace to="/pacientes/nuevo" tamano="sm" icono={<UserPlus size={14} />}>Registrar paciente</BotonEnlace>}
            />
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className={claseTabla.tabla}>
                <thead>
                  <tr className={claseTabla.encabezado}>
                    <th className={claseTabla.celdaEncabezado}>Paciente</th>
                    <th className={claseTabla.celdaEncabezado}>Sedentarismo</th>
                    <th className={`${claseTabla.celdaEncabezado} w-44`}>Prob. diabetes 5 años</th>
                    <th className={claseTabla.celdaEncabezado}>Última simulación</th>
                    <th className={claseTabla.celdaEncabezado} />
                  </tr>
                </thead>
                <tbody>
                  {riesgo.map((p) => {
                    const sim = p.ultimaSimulacion;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => navigate(sim ? `/pacientes/${p.id}` : `/simulador?id=${p.id}`)}
                        className={`${claseTabla.fila} cursor-pointer`}
                      >
                        <td className={claseTabla.celda}>
                          <div className="flex items-center gap-3">
                            <Avatar nombre={p.nombre} tamano={32} />
                            <div>
                              <p className="font-medium text-white">{p.nombre}</p>
                              <p className="text-xs text-hud-tenue">{p.edad} años · IMC {p.imc}</p>
                            </div>
                          </div>
                        </td>
                        <td className={claseTabla.celda}><SedentarismoBadge nivel={p.sedentarismo} /></td>
                        <td className={claseTabla.celda}>
                          {sim ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-white/10">
                                <div className="h-1.5 rounded-full" style={{ width: `${Math.max(3, sim.prob5)}%`, backgroundColor: colorProb(sim.prob5), }} />
                              </div>
                              <span className="w-10 text-right font-mono text-sm font-semibold" style={{ color: tinta(colorProb(sim.prob5)) }}>{sim.prob5}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-hud-tenue">Sin simular</span>
                          )}
                        </td>
                        <td className={`${claseTabla.celda} text-hud-suave`}>{sim ? formatearFecha(sim.creadoEn) : "—"}</td>
                        <td className={`${claseTabla.celda} text-right`}>
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-hud-acento">
                            {sim ? "Ver ficha" : "Simular"} <ChevronRight size={14} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel titulo="Distribución por sedentarismo" descripcion="Nivel de actividad física registrado de tus pacientes.">
          {!riesgo ? (
            <Cargando />
          ) : (
            <div className="space-y-4">
              {SEDENTARISMO.map((nivel) => {
                const n = resumen.porNivel[nivel];
                const pct = resumen.total ? (n / resumen.total) * 100 : 0;
                return (
                  <div key={nivel}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="flex items-center gap-2 text-hud-texto">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_SEDENTARISMO[nivel], }} />
                        {NOMBRE_SEDENTARISMO[nivel]}
                      </span>
                      <span className="font-mono text-white">{n}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLOR_SEDENTARISMO[nivel] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
