import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pause, Pencil, Play, Trash2, X } from "lucide-react";
import { ModalEscenario } from "../components/ModalEscenario";
import { NOMBRE_NIVEL, resumenEscenario, textoAntecedente } from "../lib/perfil";
import { Shell } from "../components/Shell";
import { StageBadge } from "../components/StageBadge";
import { SedentarismoBadge } from "../components/SedentarismoBadge";
import { SegmentedBar } from "../components/SegmentedBar";
import { TrajectoryChart } from "../components/TrajectoryChart";
import { usePaleta } from "../components/temaGraficas";
import {
  BarrasTiempoLibre,
  GraficaIncidencia,
  GraficaPreDiagnostico,
  HistogramaDiagnostico,
  PanelCuatroGraficas,
  type ModoPanel,
} from "../components/GraficasInforme";
import { PanelAnatomico, estadoDesdeAnio, estadoDesdePaciente } from "../components/PanelAnatomico";
import { Aviso, Boton, Campo, Muestra, Panel, Pestanas, Segmentado, Selector, claseTabla } from "../components/ui";
import { api } from "../api/client";
import type { DatosEscenario, Escenario, Paciente, PuntoSerie, ResultadoEscenario, SimulateResponse, SimulationRunSummary } from "../types";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const MARCADORES = [
  { clave: "glucosa" as const, etiqueta: "Glucosa", unidad: "mg/dL" },
  { clave: "insulina" as const, etiqueta: "Insulina", unidad: "µU/mL" },
  { clave: "homaIR" as const, etiqueta: "HOMA-IR", unidad: "" },
  { clave: "homaBeta" as const, etiqueta: "HOMA-β", unidad: "% de función" },
  { clave: "deficitBeta" as const, etiqueta: "Déficit beta", unidad: "%" },
  { clave: "sensibilidad" as const, etiqueta: "Sensibilidad S_I", unidad: "S_I" },
];

function puntosAnuales(r: ResultadoEscenario): PuntoSerie[] {
  return r.serie.filter((p) => Math.abs(p.anio - Math.round(p.anio)) < 1e-6);
}

function textoTiempo(r: ResultadoEscenario, horizonte: number) {
  if (r.sinDiabetesEnHorizonte) return `más de ${horizonte} años`;
  return `${r.tiempoMedianoDiagnostico?.toFixed(1)} años`;
}

export default function Simulator() {
  const [params, setParams] = useSearchParams();
  const pacienteId = params.get("id");
  const paleta = usePaleta();

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
  const colorVista = paleta[escenarioVista % paleta.length];
  const pestanasEscenario = resultados?.resultados.map((r, i) => ({ clave: i, etiqueta: r.nombre })) ?? [];

  return (
    <Shell titulo="Simulador de pronóstico" subtitulo="Cada escenario se repite cientos de veces con azar distinto; el resultado es una probabilidad, no una única respuesta.">
      {errorPaciente && (
        <div className="mb-5">
          <Aviso tipo="error">{errorPaciente}. Elige otro paciente de la lista.</Aviso>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-y border-hud-borde-fuerte py-3">
        <div className="flex items-center gap-3">
          <label htmlFor="paciente" className="text-sm text-hud-tenue">Paciente</label>
          <Selector id="paciente" value={pacienteId ?? ""} onChange={(e) => setParams({ id: e.target.value })} className="!w-auto min-w-52 font-medium">
            {pacientesTodos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Selector>
        </div>
        {paciente && (
          <div className="cifras flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-hud-suave">
            <span>{paciente.edad} años</span>
            <span>IMC {paciente.imc}</span>
            <SedentarismoBadge nivel={paciente.sedentarismo} />
            <span>{textoAntecedente(paciente.antecedente_familiar)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[290px_1fr]">
        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          <Panel titulo="Escenarios" descripcion="Hasta 4. Cada uno es un “¿y si…?” sobre el estilo de vida.">
            <ul className="border-t border-hud-borde">
              {escenarios.map((esc, i) => (
                <li key={esc.id} className="group flex items-start gap-3 border-b border-hud-borde py-3">
                  <Muestra color={paleta[i % paleta.length]} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{esc.nombre}</p>
                    <p className="text-xs text-hud-tenue">{NOMBRE_NIVEL[esc.nivel_intervencion]}</p>
                    {paciente && <p className="mt-0.5 text-xs text-hud-suave">{resumenEscenario(esc, paciente.sedentarismo)}</p>}
                  </div>
                  <div className="flex gap-1 text-hud-tenue">
                    <button onClick={() => setModal({ abierto: true, escenario: esc })} aria-label={`Editar ${esc.nombre}`} className="rounded p-1 hover:text-hud-acento">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => quitarEscenario(esc.id)} aria-label={`Quitar ${esc.nombre}`} className="rounded p-1 hover:text-rose-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setModal({ abierto: true, escenario: null })}
              disabled={escenarios.length >= 4 || !paciente}
              className="mt-3 text-sm font-medium text-hud-acento hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
            >
              + Agregar escenario
            </button>
          </Panel>

          {paciente && (
            <ModalEscenario abierto={modal.abierto} escenario={modal.escenario} paciente={paciente} horizonte={horizonte} onCerrar={cerrarModal} onGuardar={guardarEscenario} />
          )}

          <Panel titulo="Corrida">
            <div className="space-y-4">
              <Campo etiqueta={`Años a proyectar: ${horizonte}`} htmlFor="horizonte">
                <input id="horizonte" type="range" min={1} max={20} value={horizonte} onChange={(e) => setHorizonte(+e.target.value)} className="w-full" />
              </Campo>
              <Campo etiqueta="Trayectorias por escenario" htmlFor="trayectorias" ayuda="Más trayectorias dan bandas más estables, pero tardan más.">
                <Selector id="trayectorias" value={trayectorias} onChange={(e) => setTrayectorias(+e.target.value)}>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </Selector>
              </Campo>
              <Boton onClick={ejecutar} cargando={cargando} disabled={escenarios.length === 0} className="w-full">
                {cargando ? "Simulando…" : "Ejecutar simulación"}
              </Boton>
              {escenarios.length === 0 && <p className="text-xs text-hud-tenue">Agrega al menos un escenario para simular.</p>}
              {error && <Aviso tipo="error">{error}</Aviso>}
            </div>
          </Panel>

          {historial.length > 0 && (
            <Panel titulo="Historial" descripcion={resultados ? "Compara la simulación actual con una anterior." : "Ejecuta una simulación para poder comparar."}>
              <ul className="max-h-64 overflow-y-auto border-t border-hud-borde">
                {historial.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 border-b border-hud-borde py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="cifras truncate text-sm text-white">{formatearFecha(h.creado_en)}</p>
                      <p className="truncate text-xs text-hud-tenue">{h.horizonte_anios} años · {h.nombresEscenarios.join(", ")}</p>
                    </div>
                    <Boton variante="secundario" tamano="sm" onClick={() => compararCon(h.id)} cargando={cargandoComparacion === h.id} disabled={!resultados || resultados.runId === h.id}>
                      Comparar
                    </Boton>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>

        <div className="min-w-0 space-y-12">
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
                    <Pestanas opciones={pestanasEscenario} activa={escenarioVista} onCambio={(i) => { setEscenarioVista(i); setAnioVista(0); setReproduciendo(true); }} etiqueta="Escenario mostrado" />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (anioVista >= ultimoAnio) setAnioVista(0);
                          setReproduciendo((v) => !v);
                        }}
                        aria-label={reproduciendo ? "Pausar" : "Reproducir"}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-hud-borde-fuerte text-hud-texto hover:bg-hud-panel-2"
                      >
                        {reproduciendo ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                      </button>
                      <input type="range" min={0} max={ultimoAnio} value={anioVista} onChange={(e) => { setReproduciendo(false); setAnioVista(+e.target.value); }} className="flex-1" aria-label="Año de la proyección" />
                      <span className="cifras w-20 text-right text-sm text-hud-suave">Año {anioVista} / {ultimoAnio}</span>
                    </div>
                    {punto && <SegmentedBar pct={punto.etapaPct} />}
                    <p className="text-xs text-hud-tenue">Valores medianos de las trayectorias en ese año; la barra muestra cómo se reparten entre etapas.</p>
                  </div>
                ) : (
                  <p className="text-sm text-hud-suave">Estado inicial del modelo. Define los escenarios y ejecuta la simulación para ver cómo evolucionaría año a año.</p>
                )}
              </PanelAnatomico>
            );
          })()}

          {resultados && resultadoVista && (
            <>
              <Panel titulo="Resultados por escenario" descripcion={`${resultados.trayectorias} trayectorias por escenario, horizonte de ${resultados.horizonteAnios} años.`}>
                <div className="overflow-x-auto">
                  <table className={claseTabla.tabla}>
                    <thead>
                      <tr className={claseTabla.encabezado}>
                        <th className={claseTabla.celdaEncabezado}>Escenario</th>
                        <th className={`${claseTabla.celdaEncabezado} text-right`}>Prob. a {Math.min(5, resultados.horizonteAnios)} años</th>
                        <th className={`${claseTabla.celdaEncabezado} text-right`}>Prob. a {resultados.horizonteAnios} años</th>
                        <th className={claseTabla.celdaEncabezado}>Diagnóstico mediano</th>
                        <th className={claseTabla.celdaEncabezado}>Etapa al final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.resultados.map((r, i) => (
                        <tr key={r.escenarioId} className={claseTabla.fila}>
                          <td className={claseTabla.celda}>
                            <span className="flex items-center gap-2 font-medium text-white"><Muestra color={paleta[i % paleta.length]} />{r.nombre}</span>
                          </td>
                          <td className={`${claseTabla.celda} cifras text-right font-serif text-xl font-semibold text-white`}>{r.prob5} %</td>
                          <td className={`${claseTabla.celda} cifras text-right text-hud-texto`}>{r.probHorizonte} %</td>
                          <td className={`${claseTabla.celda} cifras text-hud-texto`}>
                            {textoTiempo(r, resultados.horizonteAnios)}
                            {r.edadMedianaDiagnostico != null && <span className="text-hud-tenue"> · a los {r.edadMedianaDiagnostico.toFixed(0)} años</span>}
                          </td>
                          <td className={claseTabla.celda}><StageBadge etapa={r.etapaMediana} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {comparacion && (
                  <div className="mt-6 border-t border-hud-borde pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-white">Frente a la simulación del {formatearFecha(comparacion.creadoEn)}</p>
                      <button onClick={() => setComparacion(null)} aria-label="Cerrar comparación" className="text-hud-tenue hover:text-white"><X size={16} /></button>
                    </div>
                    <table className={claseTabla.tabla}>
                      <thead>
                        <tr className={claseTabla.encabezado}>
                          <th className={claseTabla.celdaEncabezado}>Escenario</th>
                          <th className={claseTabla.celdaEncabezado}>Prob. a 5 años</th>
                          <th className={claseTabla.celdaEncabezado}>Prob. al horizonte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.resultados.map((actual) => {
                          const antes = comparacion.resultados.find((r) => r.nombre === actual.nombre);
                          if (!antes) return null;
                          const delta = actual.prob5 - antes.prob5;
                          return (
                            <tr key={actual.escenarioId} className={claseTabla.fila}>
                              <td className={`${claseTabla.celda} text-white`}>{actual.nombre}</td>
                              <td className={`${claseTabla.celda} cifras`}>
                                <span className="text-hud-tenue">{antes.prob5} %</span> → <b className="text-white">{actual.prob5} %</b>{" "}
                                <span className={delta > 0 ? "text-rose-400" : delta < 0 ? "text-emerald-400" : "text-hud-tenue"}>({delta > 0 ? "+" : ""}{delta.toFixed(0)})</span>
                              </td>
                              <td className={`${claseTabla.celda} cifras text-hud-texto`}>{antes.probHorizonte} % → {actual.probHorizonte} %</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel
                titulo="Figura 1 · Perfil metabólico"
                descripcion={`Escenario «${resultadoVista.nombre}». Las cuatro gráficas del informe: glucemia, secreción de insulina, pérdida de células β y sensibilidad.`}
                acciones={<Segmentado etiqueta="Qué mostrar" opciones={[{ clave: "individual" as const, etiqueta: "Una trayectoria" }, { clave: "mediana" as const, etiqueta: "Mediana y banda" }]} activa={modoPanel} onCambio={setModoPanel} />}
              >
                {resultados.resultados.length > 1 && (
                  <div className="mb-5">
                    <Pestanas opciones={pestanasEscenario} activa={escenarioVista} onCambio={setEscenarioVista} etiqueta="Escenario de la figura" />
                  </div>
                )}
                <PanelCuatroGraficas resultado={resultadoVista} modo={modoPanel} color={colorVista} />
                <p className="mt-4 text-xs text-hud-tenue">
                  {modoPanel === "individual"
                    ? "Trayectoria representativa: la simulación cuyo diagnóstico está más cerca de la mediana."
                    : "Línea: mediana de las trayectorias. Sombra: percentiles 10 a 90."}
                </p>
              </Panel>

              <div className="grid grid-cols-1 gap-x-10 gap-y-12 xl:grid-cols-2">
                <Panel titulo="Figura 2 · Tiempo libre de diabetes" descripcion="Años hasta el diagnóstico mediano de cada escenario.">
                  <BarrasTiempoLibre resultados={resultados.resultados} horizonte={resultados.horizonteAnios} />
                </Panel>
                <Panel titulo="Figura 3 · Incidencia acumulada" descripcion="Porcentaje de trayectorias que llegaron a 126 mg/dL.">
                  <GraficaIncidencia resultados={resultados.resultados} horizonte={resultados.horizonteAnios} />
                </Panel>
              </div>

              <div className="grid grid-cols-1 gap-x-10 gap-y-12 xl:grid-cols-2">
                <Panel titulo="Figura 4 · Antes del diagnóstico" descripcion={`Trayectorias diagnosticadas, alineadas al momento del diagnóstico. Escenario «${resultadoVista.nombre}».`}>
                  {resultadoVista.preDiagnostico.length > 0 ? (
                    <GraficaPreDiagnostico resultado={resultadoVista} color={colorVista} />
                  ) : (
                    <p className="py-10 text-sm text-hud-tenue">Este escenario casi no tiene diagnósticos en el horizonte elegido.</p>
                  )}
                </Panel>
                <Panel titulo="Figura 5 · Dispersión del diagnóstico" descripcion={`Cuántas trayectorias se diagnostican en cada año. Escenario «${resultadoVista.nombre}».`}>
                  {resultadoVista.tiemposDiagnostico.length > 0 ? (
                    <HistogramaDiagnostico resultado={resultadoVista} color={colorVista} horizonte={resultados.horizonteAnios} />
                  ) : (
                    <p className="py-10 text-sm text-hud-tenue">Ninguna trayectoria se diagnostica dentro del horizonte.</p>
                  )}
                </Panel>
              </div>

              <Panel titulo="Figura 6 · Comparación de escenarios" acciones={<Pestanas opciones={MARCADORES.map((m) => ({ clave: m.clave, etiqueta: m.etiqueta }))} activa={marcador} onCambio={setMarcador} etiqueta="Variable" />}>
                <TrajectoryChart resultados={resultados.resultados} marcador={marcador} unidad={MARCADORES.find((m) => m.clave === marcador)?.unidad ?? ""} />
                <p className="mt-2 text-xs text-hud-tenue">Línea: mediana de cada escenario. Sombra: percentiles 10 a 90.</p>
              </Panel>

              <Panel titulo="Etapa esperada al final del horizonte">
                <div className="space-y-4">
                  {resultados.resultados.map((r, i) => (
                    <div key={r.escenarioId} className="grid grid-cols-[160px_1fr] items-start gap-4">
                      <span className="flex items-center gap-2 pt-px text-sm text-hud-texto"><Muestra color={paleta[i % paleta.length]} />{r.nombre}</span>
                      <SegmentedBar pct={r.serie[r.serie.length - 1].etapaPct} />
                    </div>
                  ))}
                </div>
              </Panel>

              <details className="group border-t border-hud-borde-fuerte pt-5">
                <summary className="cursor-pointer list-none font-serif text-xl font-semibold text-white marker:content-none">
                  Variables aleatorias y supuestos de esta simulación
                  <span className="ml-2 text-sm font-normal text-hud-tenue group-open:hidden">mostrar</span>
                </summary>
                <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-white">Variables aleatorias</h3>
                    <ul className="border-t border-hud-borde text-sm">
                      {resultados.supuestos.variablesAleatorias.map((v) => (
                        <li key={v.simbolo} className="border-b border-hud-borde py-2">
                          <span className="font-mono text-hud-acento">{v.simbolo}</span> <span className="text-hud-texto">· {v.nombre}</span>
                          <span className="block text-xs text-hud-tenue">{v.distribucion} — {v.parametros}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-white">Estado inicial del paciente</h3>
                    <dl className="cifras border-t border-hud-borde text-sm">
                      {[
                        ["S_I0 · sensibilidad inicial", resultadoVista.estadoInicial.sI0],
                        ["k_VAT · desgaste adiposo", resultadoVista.estadoInicial.kVat],
                        ["riesgo_vida · media sorteada", resultadoVista.estadoInicial.riesgoVida],
                        ["a_gen · media sorteada", resultadoVista.estadoInicial.aGen],
                        ["Semilla aleatoria", resultados.semilla],
                      ].map(([etiqueta, valor]) => (
                        <div key={etiqueta} className="flex justify-between border-b border-hud-borde py-2">
                          <dt className="text-hud-suave">{etiqueta}</dt>
                          <dd className="font-mono text-white">{valor}</dd>
                        </div>
                      ))}
                    </dl>
                    <h3 className="mb-2 mt-6 text-sm font-medium text-white">Parámetros fijos del modelo</h3>
                    <dl className="cifras max-h-40 overflow-y-auto border-t border-hud-borde text-sm">
                      {Object.entries(resultados.supuestos.parametrosFijos).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-hud-borde py-1.5">
                          <dt className="text-hud-suave">{k}</dt>
                          <dd className="font-mono text-white">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                <p className="mt-6 border-l-4 border-amber-300 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
                  El modelo usa las constantes de Topp et al. adaptadas en el informe y todavía no se validó con datos locales (SNIS-VE / SEDES La Paz).
                  Los resultados son pronósticos orientativos con incertidumbre, no diagnósticos.
                </p>
              </details>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
