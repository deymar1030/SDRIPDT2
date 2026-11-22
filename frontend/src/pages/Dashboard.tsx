import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { SedentarismoBadge } from "../components/SedentarismoBadge";
import { Aviso, BotonEnlace, Cargando, Muestra, Panel, Vacio, claseTabla } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { COLOR_SEDENTARISMO, NOMBRE_SEDENTARISMO, SEDENTARISMO } from "../lib/perfil";
import type { PacienteRiesgo, Sedentarismo } from "../types";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function colorProb(prob: number) {
  if (prob >= 60) return "#b42318";
  if (prob >= 30) return "#c2571a";
  if (prob >= 10) return "#b7791f";
  return "#2f7d5b";
}

function Cifra({ etiqueta, valor, nota }: { etiqueta: string; valor: string | number; nota: string }) {
  return (
    <div className="border-l border-hud-borde-fuerte pl-4 first:border-l-0 first:pl-0">
      <dt className="text-sm text-hud-suave">{etiqueta}</dt>
      <dd className="cifras mt-1 font-serif text-4xl font-semibold leading-none text-white">{valor}</dd>
      <p className="mt-1.5 text-xs text-hud-tenue">{nota}</p>
    </div>
  );
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
    <Shell titulo={primerNombre ? `Buenos días, ${primerNombre}` : "Panel principal"} subtitulo="Resumen de tus pacientes y a quién conviene contactar primero.">
      {error && <div className="mb-4"><Aviso tipo="error">{error}</Aviso></div>}

      <dl className="mb-12 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <Cifra etiqueta="Pacientes" valor={riesgo ? resumen.total : "—"} nota="registrados por ti" />
        <Cifra etiqueta="En riesgo" valor={riesgo ? resumen.enRiesgo : "—"} nota="probabilidad a 5 años de 50 % o más" />
        <Cifra etiqueta="Simulados" valor={riesgo ? resumen.simulados : "—"} nota="con al menos un pronóstico" />
        <Cifra etiqueta="Sin simular" valor={riesgo ? resumen.total - resumen.simulados : "—"} nota="pendientes de pronóstico" />
      </dl>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 xl:grid-cols-[1fr_260px]">
        <Panel
          titulo="Pacientes por riesgo"
          descripcion="Ordenados por la probabilidad de diabetes a 5 años del escenario sin cambios."
          acciones={<BotonEnlace to="/pacientes/nuevo" variante="secundario" tamano="sm">Registrar paciente</BotonEnlace>}
        >
          {!riesgo ? (
            <Cargando />
          ) : riesgo.length === 0 ? (
            <Vacio titulo="Todavía no hay pacientes" descripcion="Registra tu primer paciente para empezar a simular pronósticos." accion={<BotonEnlace to="/pacientes/nuevo" tamano="sm">Registrar paciente</BotonEnlace>} />
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className={claseTabla.tabla}>
                <thead>
                  <tr className={claseTabla.encabezado}>
                    <th className={claseTabla.celdaEncabezado}>Paciente</th>
                    <th className={claseTabla.celdaEncabezado}>Sedentarismo</th>
                    <th className={`${claseTabla.celdaEncabezado} w-48`}>Prob. a 5 años</th>
                    <th className={claseTabla.celdaEncabezado}>Última simulación</th>
                  </tr>
                </thead>
                <tbody>
                  {riesgo.map((p) => {
                    const sim = p.ultimaSimulacion;
                    return (
                      <tr key={p.id} onClick={() => navigate(sim ? `/pacientes/${p.id}` : `/simulador?id=${p.id}`)} className={`${claseTabla.fila} cursor-pointer`}>
                        <td className={claseTabla.celda}>
                          <p className="font-medium text-white">{p.nombre}</p>
                          <p className="cifras text-xs text-hud-tenue">{p.edad} años · IMC {p.imc}</p>
                        </td>
                        <td className={claseTabla.celda}><SedentarismoBadge nivel={p.sedentarismo} /></td>
                        <td className={claseTabla.celda}>
                          {sim ? (
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 flex-1 bg-hud-panel-2">
                                <div className="h-full" style={{ width: `${Math.max(2, sim.prob5)}%`, backgroundColor: colorProb(sim.prob5) }} />
                              </div>
                              <span className="cifras w-12 text-right font-medium text-white">{sim.prob5} %</span>
                            </div>
                          ) : (
                            <span className="text-sm text-hud-tenue">Sin simular</span>
                          )}
                        </td>
                        <td className={`${claseTabla.celda} cifras text-hud-suave`}>{sim ? formatearFecha(sim.creadoEn) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel titulo="Por sedentarismo">
          {!riesgo ? (
            <Cargando />
          ) : (
            <ul className="space-y-3 text-sm">
              {SEDENTARISMO.map((nivel) => {
                const n = resumen.porNivel[nivel];
                const pct = resumen.total ? (n / resumen.total) * 100 : 0;
                return (
                  <li key={nivel}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-hud-texto"><Muestra color={COLOR_SEDENTARISMO[nivel]} />{NOMBRE_SEDENTARISMO[nivel]}</span>
                      <span className="cifras text-white">{n}</span>
                    </div>
                    <div className="h-1.5 bg-hud-panel-2"><div className="h-full" style={{ width: `${pct}%`, backgroundColor: COLOR_SEDENTARISMO[nivel] }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
