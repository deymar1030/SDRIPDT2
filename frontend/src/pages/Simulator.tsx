import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2, History, X, Play, Pause, FlaskConical, ChevronDown, Pencil, Activity, Scale, CalendarRange } from "lucide-react";
import { ModalEscenario } from "../components/ModalEscenario";
import { NOMBRE_NIVEL, resumenEscenario, textoAntecedente } from "../lib/perfil";
import { Shell } from "../components/Shell";
import { StageBadge } from "../components/StageBadge";
import { SedentarismoBadge } from "../components/SedentarismoBadge";
import { SegmentedBar } from "../components/SegmentedBar";
import { TrajectoryChart, PALETA_ESCENARIOS } from "../components/TrajectoryChart";
import {
  BarrasTiempoLibre,
  GraficaIncidencia,
  GraficaPreDiagnostico,
  HistogramaDiagnostico,
  PanelCuatroGraficas,
  type ModoPanel,
} from "../components/GraficasInforme";
import { PanelAnatomico, estadoDesdeAnio, estadoDesdePaciente } from "../components/PanelAnatomico";
import { Aviso, Avatar, Boton, Campo, Panel, Selector, claseTabla, tinta } from "../components/ui";
import { api } from "../api/client";
import type { DatosEscenario, Escenario, Paciente, PuntoSerie, ResultadoEscenario, SimulateResponse, SimulationRunSummary } from "../types";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const MARCADORES = [
  { clave: "glucosa" as const, etiqueta: "Glucosa", unidad: "mg/dL" },
  { clave: "insulina" as const, etiqueta: "Insulina", unidad: "µU/mL" },
  { clave: "homaIR" as const, etiqueta: "HOMA-IR", unidad: "" },
  { clave: "homaBeta" as const, etiqueta: "HOMA-β", unidad: "% función" },
  { clave: "deficitBeta" as const, etiqueta: "Déficit beta", unidad: "%" },
  { clave: "sensibilidad" as const, etiqueta: "Sensibilidad S_I", unidad: "S_I" },
];

function Pestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        activa ? "border-hud-acento bg-hud-acento/15 text-white" : "border-hud-borde text-hud-suave hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function puntosAnuales(r: ResultadoEscenario): PuntoSerie[] {
  return r.serie.filter((p) => Math.abs(p.anio - Math.round(p.anio)) < 1e-6);
}

function textoTiempo(r: ResultadoEscenario, horizonte: number) {
  if (r.sinDiabetesEnHorizonte) return `> ${horizonte} años`;
  return `${r.tiempoMedianoDiagnostico?.toFixed(1)} años`;
}

export default function Simulator() {
  const [params, setParams] = useSearchParams();
  const pacienteId = params.get("id");

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [pacientesTodos, setPacientesTodos] = useState<Paciente[]>([]);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [resultados, setResultados] = useState<SimulateResponse | null>(null);
  const [horizonte, setHorizonte] = useState(10);
  const [trayectorias, setTrayectorias] = useState(200);
  const [marcador, setMarcador] = useState<(typeof MARCADORES)[number]["clave"]>("glucosa");
  const [modoPanel, setModoPanel] = useState<ModoPanel>("individual");
  const [modal, setModal] = useState<{ abierto: boolean; escenario: Escenario | null }>({ abierto: false, escenario: null });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPaciente, setErrorPaciente] = useState<string | null>(null);
  const [historial, setHistorial] = useState<SimulationRunSummary[]>([]);
  const [comparacion, setComparacion] = useState<SimulateResponse | null>(null);
  const [cargandoComparacion, setCargandoComparacion] = useState<number | null>(null);
  const [escenarioVista, setEscenarioVista] = useState(0);
  const [anioVista, setAnioVista] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);

  const ultimoAnio = resultados ? resultados.horizonteAnios : 0;

  useEffect(() => {
    if (!reproduciendo || !resultados) return;
    if (anioVista >= ultimoAnio) {
      setReproduciendo(false);
      return;
    }
    const t = setTimeout(() => setAnioVista((a) => a + 1), 700);
    return () => clearTimeout(t);
  }, [reproduciendo, anioVista, ultimoAnio, resultados]);

  useEffect(() => {
    api.listarPacientes().then((lista) => {
      setPacientesTodos(lista);
      if (!pacienteId && lista.length) setParams({ id: String(lista[0].id) });
    }).catch(() => setPacientesTodos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function recargarHistorial(id: number) {
    api.listarSimulaciones(id).then(setHistorial).catch(() => setHistorial([]));
  }

  useEffect(() => {
    if (!pacienteId) return;
    setErrorPaciente(null);
    api.obtenerPaciente(Number(pacienteId)).then(setPaciente).catch((e) => {
      setPaciente(null);
      setErrorPaciente(e instanceof Error ? e.message : "No se pudo cargar al paciente");
    });
    api.listarEscenarios(Number(pacienteId)).then(setEscenarios).catch(() => setEscenarios([]));
    setResultados(null);
    setComparacion(null);
    recargarHistorial(Number(pacienteId));
  }, [pacienteId]);

  async function ejecutar() {
    if (!pacienteId || escenarios.length === 0) return;
    setCargando(true);
    setError(null);
    try {
      const salida = await api.simular(Number(pacienteId), horizonte, trayectorias);
      setResultados(salida);
      setComparacion(null);
      setEscenarioVista(0);
      setAnioVista(0);
      setReproduciendo(true);
      recargarHistorial(Number(pacienteId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo simular");
    } finally {
      setCargando(false);
    }
  }

  async function compararCon(runId: number) {
    if (!pacienteId) return;
    setCargandoComparacion(runId);
    try {
      setComparacion(await api.obtenerSimulacion(Number(pacienteId), runId));
    } finally {
      setCargandoComparacion(null);
    }
  }

  const cerrarModal = useCallback(() => setModal({ abierto: false, escenario: null }), []);

  async function guardarEscenario(datos: DatosEscenario) {
    if (!pacienteId) return;
    const editado = modal.escenario;
    if (editado) {
      const esc = await api.actualizarEscenario(Number(pacienteId), editado.id, datos);
      setEscenarios((prev) => prev.map((e) => (e.id === esc.id ? esc : e)));
    } else {
      const esc = await api.crearEscenario(Number(pacienteId), datos);
      setEscenarios((prev) => [...prev, esc]);
    }
    cerrarModal();
  }

  async function quitarEscenario(id: number) {
    if (!pacienteId) return;
    await api.eliminarEscenario(Number(pacienteId), id);
    setEscenarios((prev) => prev.filter((e) => e.id !== id));
  }

  const resultadoVista = resultados?.resultados[Math.min(escenarioVista, resultados.resultados.length - 1)];
  const colorVista = PALETA_ESCENARIOS[escenarioVista % PALETA_ESCENARIOS.length];

  return (
    <Shell titulo="Simulador de pronóstico" subtitulo="Monte Carlo · modelo de Topp et al. en pasos de 1/5 de día">
      {errorPaciente && (
        <div className="mb-5">
          <Aviso tipo="error">{errorPaciente}. Elige otro paciente de la lista.</Aviso>
        </div>
      )}

      <Panel className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {paciente && <Avatar nombre={paciente.nombre} tamano={40} />}
            <div className="relative">
              <select
                value={pacienteId ?? ""}
                onChange={(e) => setParams({ id: e.target.value })}
                aria-label="Paciente"
                className="appearance-none rounded-lg border border-hud-borde bg-hud-fondo/60 py-2 pl-3 pr-9 text-base font-semibold text-white focus:border-hud-acento focus:outline-none"
              >
                {pacientesTodos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-hud-suave" />
            </div>
          </div>
          {paciente && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-sm text-hud-suave">
              <span>{paciente.edad} años</span>
              <span>IMC <b className="text-white">{paciente.imc}</b></span>
              <SedentarismoBadge nivel={paciente.sedentarismo} />
              <span className="font-sans text-xs">{textoAntecedente(paciente.antecedente_familiar)}</span>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-5">
          <Panel titulo="Escenarios a comparar" descripcion="Hasta 4. Cada uno es un “¿y si…?” sobre el estilo de vida del paciente.">
            <div className="space-y-2">
              {escenarios.map((esc, i) => {
                const color = PALETA_ESCENARIOS[i % PALETA_ESCENARIOS.length];
                return (
                  <div key={esc.id} className="group rounded-lg border border-hud-borde bg-hud-fondo/40 px-3 py-2.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color, }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{esc.nombre}</p>
                        <p className="text-[11px] text-hud-tenue">{NOMBRE_NIVEL[esc.nivel_intervencion]}</p>
                      </div>
                      <div className="flex gap-1 opacity-70 transition group-hover:opacity-100">
                        <button onClick={() => setModal({ abierto: true, escenario: esc })} aria-label={`Editar ${esc.nombre}`} className="rounded p-1 text-hud-tenue hover:text-hud-acento">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => quitarEscenario(esc.id)} aria-label={`Quitar ${esc.nombre}`} className="rounded p-1 text-hud-tenue hover:text-rose-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {paciente && (
                      <p className="mt-2 flex items-center gap-1.5 pl-5 text-[11px] text-hud-suave">
                        {esc.nivel_intervencion === "nula" ? <Activity size={12} className="flex-shrink-0 text-hud-tenue" /> : esc.parametros?.inicio_anio ? <CalendarRange size={12} className="flex-shrink-0 text-hud-tenue" /> : <Scale size={12} className="flex-shrink-0 text-hud-tenue" />}
                        {resumenEscenario(esc, paciente.sedentarismo)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setModal({ abierto: true, escenario: null })}
              disabled={escenarios.length >= 4 || !paciente}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-hud-borde-fuerte px-3 py-2 text-sm font-medium text-hud-suave transition-colors hover:border-hud-acento hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} /> Agregar escenario
            </button>
          </Panel>

          {paciente && (
            <ModalEscenario
              abierto={modal.abierto}
              escenario={modal.escenario}
              paciente={paciente}
              horizonte={horizonte}
              onCerrar={cerrarModal}
              onGuardar={guardarEscenario}
            />
          )}

          <Panel titulo="Parámetros de la corrida">
            <div className="space-y-4">
              <Campo etiqueta={`Años a proyectar · ${horizonte}`} htmlFor="horizonte">
                <input id="horizonte" type="range" min={1} max={20} value={horizonte} onChange={(e) => setHorizonte(+e.target.value)} className="w-full" />
              </Campo>
              <Campo etiqueta="Trayectorias simuladas" htmlFor="trayectorias" ayuda="Más trayectorias = bandas más estables, pero tarda más.">
                <Selector id="trayectorias" value={trayectorias} onChange={(e) => setTrayectorias(+e.target.value)}>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </Selector>
              </Campo>
              <Boton onClick={ejecutar} cargando={cargando} disabled={escenarios.length === 0} icono={<FlaskConical size={16} />} className="w-full">
                {cargando ? "Simulando…" : "Ejecutar simulación"}
              </Boton>
              {escenarios.length === 0 && <p className="text-xs text-hud-tenue">Agrega al menos un escenario para simular.</p>}
              {error && <Aviso tipo="error">{error}</Aviso>}
            </div>
          </Panel>

          {historial.length > 0 && (
            <Panel titulo="Historial" descripcion={resultados ? "Compara la simulación actual con una anterior." : "Ejecuta una simulación para poder comparar."}>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {historial.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-lg border border-hud-borde bg-hud-fondo/40 px-2.5 py-2">
                    <History size={14} className="flex-shrink-0 text-hud-acento" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{formatearFecha(h.creado_en)}</p>
                      <p className="truncate text-[11px] text-hud-tenue">{h.horizonte_anios} años · {h.nombresEscenarios.join(", ")}</p>
                    </div>
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => compararCon(h.id)}
                      cargando={cargandoComparacion === h.id}
                      disabled={!resultados || resultados.runId === h.id}
                    >
                      Comparar
                    </Boton>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>

        <div className="min-w-0 space-y-5">
          {paciente && (() => {
            const anuales = resultadoVista ? puntosAnuales(resultadoVista) : [];
            const punto = anuales[Math.min(anioVista, anuales.length - 1)];
            const cambio = resultadoVista?.intervencion;
            const imcEnTiempo = cambio?.cambia && anioVista >= cambio.inicioAnio ? cambio.imc : paciente.imc;
            const estado = punto ? estadoDesdeAnio(punto, imcEnTiempo) : estadoDesdePaciente(paciente);
            const momento = punto && resultadoVista ? `Año ${anioVista} · ${resultadoVista.nombre}` : "Estado inicial";
            return (
              <PanelAnatomico estado={estado} momento={momento} escaneando={cargando}>
                {resultados ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {resultados.resultados.map((r, i) => (
                        <Pestana key={r.escenarioId} activa={i === escenarioVista} onClick={() => { setEscenarioVista(i); setAnioVista(0); setReproduciendo(true); }}>
                          {r.nombre}
                        </Pestana>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (anioVista >= ultimoAnio) setAnioVista(0);
                          setReproduciendo((v) => !v);
                        }}
                        aria-label={reproduciendo ? "Pausar" : "Reproducir"}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-hud-acento text-slate-950  hover:brightness-110"
                      >
                        {reproduciendo ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={ultimoAnio}
                        value={anioVista}
                        onChange={(e) => { setReproduciendo(false); setAnioVista(+e.target.value); }}
                        className="flex-1"
                        aria-label="Año de la proyección"
                      />
                      <span className="w-20 text-right font-mono text-xs text-sky-200">Año {anioVista} / {ultimoAnio}</span>
                    </div>
                    {punto && <SegmentedBar pct={punto.etapaPct} />}
                    <p className="text-[11px] text-sky-200/50">
                      Valores medianos de las trayectorias simuladas en ese año; la barra muestra cómo se reparten entre etapas.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-sky-200/60">
                    Estado inicial del modelo. Define los escenarios y presiona "Ejecutar simulación" para ver cómo evolucionaría año a año.
                  </p>
                )}
              </PanelAnatomico>
            );
          })()}

          {resultados && resultadoVista && (
            <>
              <Panel titulo="Comparación entre escenarios">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {resultados.resultados.map((r, i) => {
                    const color = PALETA_ESCENARIOS[i % PALETA_ESCENARIOS.length];
                    return (
                      <div key={r.escenarioId} className="relative overflow-hidden rounded-xl border bg-hud-fondo/40 p-4" style={{ borderColor: `${color}55` }}>
                        <span className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: color, }} />
                        <p className="truncate text-xs font-medium text-hud-suave">{r.nombre}</p>
                        <p className="mt-1 font-mono text-3xl font-bold" style={{ color: tinta(color) }}>{r.prob5}%</p>
                        <p className="text-[11px] text-hud-tenue">prob. de diabetes a {Math.min(5, resultados.horizonteAnios)} años</p>
                        <p className="mt-2 text-sm text-hud-texto">
                          <span className="font-mono font-semibold">{r.probHorizonte}%</span> a {resultados.horizonteAnios} años
                        </p>
                        <p className="mt-1 text-xs text-hud-suave">
                          Diagnóstico mediano: <b className="font-mono text-white">{textoTiempo(r, resultados.horizonteAnios)}</b>
                          {r.edadMedianaDiagnostico != null && <span> (a los {r.edadMedianaDiagnostico.toFixed(0)} años)</span>}
                        </p>
                        <StageBadge etapa={r.etapaMediana} className="mt-2" />
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {comparacion && (
                <Panel
                  esquinas
                  titulo={`Comparando con la simulación del ${formatearFecha(comparacion.creadoEn)}`}
                  acciones={
                    <button onClick={() => setComparacion(null)} aria-label="Cerrar comparación" className="text-hud-suave hover:text-white">
                      <X size={16} />
                    </button>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className={claseTabla.tabla}>
                      <thead>
                        <tr className={claseTabla.encabezado}>
                          <th className={claseTabla.celdaEncabezado}>Escenario</th>
                          <th className={claseTabla.celdaEncabezado}>Prob. 5 años</th>
                          <th className={claseTabla.celdaEncabezado}>Prob. horizonte</th>
                          <th className={claseTabla.celdaEncabezado}>Etapa esperada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.resultados.map((actual) => {
                          const antes = comparacion.resultados.find((r) => r.nombre === actual.nombre);
                          if (!antes) return null;
                          const delta = actual.prob5 - antes.prob5;
                          return (
                            <tr key={actual.escenarioId} className={claseTabla.fila}>
                              <td className={`${claseTabla.celda} font-medium text-white`}>{actual.nombre}</td>
                              <td className={`${claseTabla.celda} font-mono`}>
                                <span className="text-hud-tenue">{antes.prob5}%</span> → <b className="text-white">{actual.prob5}%</b>{" "}
                                <span className={delta > 0 ? "text-rose-400" : delta < 0 ? "text-emerald-400" : "text-hud-tenue"}>
                                  ({delta > 0 ? "+" : ""}{delta.toFixed(0)})
                                </span>
                              </td>
                              <td className={`${claseTabla.celda} font-mono text-hud-texto`}>{antes.probHorizonte}% → {actual.probHorizonte}%</td>
                              <td className={claseTabla.celda}>
                                <div className="flex flex-wrap items-center gap-1.5 text-hud-tenue">
                                  <StageBadge etapa={antes.etapaMediana} /> → <StageBadge etapa={actual.etapaMediana} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}

              <Panel
                titulo={`Perfil metabólico · ${resultadoVista.nombre}`}
                descripcion="Las cuatro gráficas del informe: glucemia, secreción de insulina, pérdida de células beta y sensibilidad."
                acciones={
                  <div className="flex flex-wrap gap-2">
                    {resultados.resultados.length > 1 && resultados.resultados.map((r, i) => (
                      <Pestana key={r.escenarioId} activa={i === escenarioVista} onClick={() => setEscenarioVista(i)}>{r.nombre}</Pestana>
                    ))}
                    <Pestana activa={modoPanel === "individual"} onClick={() => setModoPanel("individual")}>Una trayectoria</Pestana>
                    <Pestana activa={modoPanel === "mediana"} onClick={() => setModoPanel("mediana")}>Mediana y banda</Pestana>
                  </div>
                }
              >
                <PanelCuatroGraficas resultado={resultadoVista} modo={modoPanel} color={colorVista} />
                <p className="mt-3 text-xs text-hud-tenue">
                  {modoPanel === "individual"
                    ? "Trayectoria representativa: la simulación cuyo diagnóstico está más cerca de la mediana, como el gráfico individual del informe."
                    : "Línea: mediana de las trayectorias; sombra: percentiles 10 a 90."}
                </p>
              </Panel>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Panel titulo="Tiempo libre de diabetes" descripcion="Años hasta el diagnóstico mediano de cada escenario.">
                  <BarrasTiempoLibre resultados={resultados.resultados} horizonte={resultados.horizonteAnios} />
                </Panel>
                <Panel titulo="Incidencia acumulada" descripcion="Porcentaje de trayectorias que llegaron a 126 mg/dL con el paso del tiempo.">
                  <GraficaIncidencia resultados={resultados.resultados} horizonte={resultados.horizonteAnios} />
                </Panel>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Panel titulo="Antes del diagnóstico" descripcion={`Glucemia de las trayectorias diagnosticadas, alineadas al momento del diagnóstico · ${resultadoVista.nombre}.`}>
                  {resultadoVista.preDiagnostico.length > 0 ? (
                    <GraficaPreDiagnostico resultado={resultadoVista} color={colorVista} />
                  ) : (
                    <p className="py-10 text-center text-sm text-hud-tenue">Este escenario casi no tiene diagnósticos en el horizonte elegido.</p>
                  )}
                </Panel>
                <Panel titulo="Dispersión del diagnóstico" descripcion={`Cuántas trayectorias se diagnostican en cada año · ${resultadoVista.nombre}.`}>
                  {resultadoVista.tiemposDiagnostico.length > 0 ? (
                    <HistogramaDiagnostico resultado={resultadoVista} color={colorVista} horizonte={resultados.horizonteAnios} />
                  ) : (
                    <p className="py-10 text-center text-sm text-hud-tenue">Ninguna trayectoria se diagnostica dentro del horizonte.</p>
                  )}
                </Panel>
              </div>

              <Panel
                titulo="Comparación de trayectorias"
                acciones={MARCADORES.map((m) => (
                  <Pestana key={m.clave} activa={marcador === m.clave} onClick={() => setMarcador(m.clave)}>{m.etiqueta}</Pestana>
                ))}
              >
                <TrajectoryChart resultados={resultados.resultados} marcador={marcador} unidad={MARCADORES.find((m) => m.clave === marcador)?.unidad ?? ""} />
                <p className="mt-2 text-xs text-hud-tenue">
                  La línea es la trayectoria mediana de cada escenario; la banda sombreada es el rango donde cae el 80% de las
                  trayectorias simuladas (percentil 10 a 90).
                </p>
              </Panel>

              <Panel titulo="Etapa esperada al final del horizonte">
                <div className="space-y-3">
                  {resultados.resultados.map((r, i) => (
                    <div key={r.escenarioId} className="flex items-center gap-3">
                      <span className="flex w-44 flex-shrink-0 items-center gap-2 truncate text-sm text-hud-texto">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: PALETA_ESCENARIOS[i % PALETA_ESCENARIOS.length] }} />
                        <span className="truncate">{r.nombre}</span>
                      </span>
                      <div className="flex-1">
                        <SegmentedBar pct={r.serie[r.serie.length - 1].etapaPct} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <details className="group rounded-2xl border border-hud-borde bg-hud-panel/80 p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300 marker:content-none">
                  Variables aleatorias y supuestos de esta simulación
                  <ChevronDown size={16} className="text-hud-suave transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs uppercase tracking-wider text-hud-suave">Variables aleatorias</h3>
                    <div className="space-y-2">
                      {resultados.supuestos.variablesAleatorias.map((v) => (
                        <div key={v.simbolo} className="rounded-lg border border-hud-borde bg-hud-fondo/40 p-2.5 text-xs">
                          <p className="font-semibold text-white">
                            <span className="font-mono text-hud-acento">{v.simbolo}</span> <span className="font-normal text-hud-suave">· {v.nombre}</span>
                          </p>
                          <p className="mt-0.5 text-hud-tenue">{v.distribucion} — {v.parametros}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs uppercase tracking-wider text-hud-suave">Estado inicial del paciente</h3>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {[
                        ["S_I0", "sensibilidad inicial", resultadoVista.estadoInicial.sI0],
                        ["k_VAT", "desgaste adiposo", resultadoVista.estadoInicial.kVat],
                        ["riesgo_vida", "media sorteada", resultadoVista.estadoInicial.riesgoVida],
                        ["a_gen", "media sorteada", resultadoVista.estadoInicial.aGen],
                      ].map(([simbolo, detalle, valor]) => (
                        <div key={simbolo} className="rounded-lg border border-hud-borde bg-hud-fondo/40 p-2.5">
                          <p className="font-mono text-[11px] text-hud-acento">{simbolo}</p>
                          <p className="font-mono text-sm font-bold text-white">{valor}</p>
                          <p className="text-[10px] text-hud-tenue">{detalle}</p>
                        </div>
                      ))}
                    </div>
                    <h3 className="mb-2 mt-4 text-xs uppercase tracking-wider text-hud-suave">Parámetros fijos del modelo</h3>
                    <div className="max-h-36 space-y-1 overflow-y-auto pr-1 text-xs">
                      {Object.entries(resultados.supuestos.parametrosFijos).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 border-b border-hud-borde/50 py-0.5">
                          <span className="text-hud-suave">{k}</span>
                          <span className="font-mono text-white">{v}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-hud-tenue">Semilla aleatoria de esta corrida: <span className="font-mono text-white">{resultados.semilla}</span></p>
                  </div>
                </div>
                <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                  El modelo usa las constantes teóricas de Topp et al. adaptadas en el informe; todavía no se calibró ni validó con
                  datos locales (SNIS-VE / SEDES La Paz). Los resultados son pronósticos orientativos con incertidumbre, no diagnósticos.
                </p>
              </details>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
