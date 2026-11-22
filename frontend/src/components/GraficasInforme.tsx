import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import type { ResultadoEscenario } from "../types";
import { useTema } from "../tema/TemaContext";
import { PALETA_ESCENARIOS } from "./TrajectoryChart";

type Fila = Record<string, number | number[]>;

function useEjes() {
  const claro = useTema().tema === "light";
  return claro
    ? { rejilla: "rgba(14,116,144,0.14)", linea: "rgba(14,116,144,0.3)", texto: "#48607f", linea1: "#1e293b", fondo: "#ffffff", borde: "rgba(14,116,144,0.3)" }
    : { rejilla: "rgba(125,200,210,0.12)", linea: "rgba(125,200,210,0.25)", texto: "#8fb3d9", linea1: "#e2e8f0", fondo: "#0b1836", borde: "rgba(125,200,210,0.4)" };
}

function redondear(valor: unknown, decimales = 2) {
  return typeof valor === "number" ? Number(valor.toFixed(decimales)) : valor;
}

interface Referencia {
  y: number;
  color: string;
  etiqueta: string;
}

interface Linea {
  clave: string;
  nombre: string;
  color?: string;
  banda?: string;
  escalon?: boolean;
}

interface MiniProps {
  titulo: string;
  datos: Fila[];
  lineas: Linea[];
  unidadY: string;
  referencias?: Referencia[];
  diagnosticoX?: number | null;
  dominioY?: [number | "auto" | ((min: number) => number), number | "auto"];
  etiquetaX?: string;
  altura?: number;
  leyenda?: boolean;
}

export function GraficaLineas({ titulo, datos, lineas, unidadY, referencias = [], diagnosticoX, dominioY, etiquetaX = "Años de simulación", altura = 260, leyenda = false }: MiniProps) {
  const ejes = useEjes();
  return (
    <div>
      <p className="mb-1 text-center text-sm font-semibold text-hud-texto">{titulo}</p>
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={datos} margin={{ top: 8, right: 14, left: 0, bottom: leyenda ? 30 : 14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ejes.rejilla} />
          <XAxis dataKey="anio" type="number" domain={["dataMin", "dataMax"]} stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} tickFormatter={(v) => String(redondear(v, 1))} label={{ value: etiquetaX, position: "insideBottom", offset: -8, fontSize: 11, fill: ejes.texto }} />
          <YAxis stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} domain={dominioY ?? ["auto", "auto"]} tickFormatter={(v) => String(redondear(v, 1))} label={{ value: unidadY, angle: -90, position: "insideLeft", fontSize: 11, fill: ejes.texto }} />
          <Tooltip
            contentStyle={{ backgroundColor: ejes.fondo, border: `1px solid ${ejes.borde}`, borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => `Año ${redondear(v, 2)}`}
            formatter={(valor, nombre) => [Array.isArray(valor) ? `${redondear(valor[0], 1)} – ${redondear(valor[1], 1)}` : String(redondear(valor, 2)), nombre]}
          />
          {leyenda && <Legend wrapperStyle={{ fontSize: 11, color: ejes.texto }} />}
          {referencias.map((r) => (
            <ReferenceLine key={r.etiqueta} y={r.y} stroke={r.color} strokeDasharray="6 4" ifOverflow="extendDomain" label={{ value: r.etiqueta, position: "insideTopLeft", fontSize: 10, fill: r.color }} />
          ))}
          {diagnosticoX != null && (
            <ReferenceLine x={diagnosticoX} stroke="#f43f5e" strokeDasharray="2 3" label={{ value: `Diagnóstico (año ${redondear(diagnosticoX, 1)})`, position: "insideTopRight", fontSize: 10, fill: "#f43f5e" }} />
          )}
          {lineas.map((l) => l.banda && (
            <Area key={`banda_${l.clave}`} dataKey={l.banda} stroke="none" fill={l.color ?? ejes.linea1} fillOpacity={0.16} legendType="none" isAnimationActive={false} name={`${l.nombre} (P10–P90)`} />
          ))}
          {lineas.map((l) => (
            <Line key={l.clave} dataKey={l.clave} name={l.nombre} type={l.escalon ? "stepAfter" : "linear"} stroke={l.color ?? ejes.linea1} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export type ModoPanel = "individual" | "mediana";

function serieVisible(resultado: ResultadoEscenario) {
  const corte = resultado.serie.findIndex((p) => p.incidencia >= 95);
  return corte >= 0 ? resultado.serie.slice(0, corte + 2) : resultado.serie;
}

export function PanelCuatroGraficas({ resultado, modo, color }: { resultado: ResultadoEscenario; modo: ModoPanel; color: string }) {
  const individual = modo === "individual";
  const datos: Fila[] = individual
    ? resultado.trayectoriaEjemplo.map((p) => ({ anio: p.anio, glucosa: p.glucosa, homaBeta: p.homaBeta, deficitBeta: p.deficitBeta, sensibilidad: p.sensibilidad }))
    : serieVisible(resultado).map((p) => ({
        anio: p.anio,
        glucosa: p.glucosa.p50, glucosa_r: [p.glucosa.p10, p.glucosa.p90],
        homaBeta: p.homaBeta.p50, homaBeta_r: [p.homaBeta.p10, p.homaBeta.p90],
        deficitBeta: p.deficitBeta.p50, deficitBeta_r: [p.deficitBeta.p10, p.deficitBeta.p90],
        sensibilidad: p.sensibilidad.p50, sensibilidad_r: [p.sensibilidad.p10, p.sensibilidad.p90],
      }));

  const anioDiagnostico = individual
    ? resultado.trayectoriaEjemplo.length && resultado.trayectoriaEjemplo[resultado.trayectoriaEjemplo.length - 1].glucosa >= 126
      ? resultado.trayectoriaEjemplo[resultado.trayectoriaEjemplo.length - 1].anio
      : null
    : resultado.tiempoMedianoDiagnostico;

  const unaLinea = (clave: string, nombre: string): Linea[] => [{ clave, nombre, color, banda: individual ? undefined : `${clave}_r` }];

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 xl:grid-cols-2">
      <GraficaLineas
        titulo="Glucemia en ayunas [G(t)]"
        datos={datos}
        lineas={unaLinea("glucosa", "Glucemia en ayunas")}
        unidadY="mg/dL"
        referencias={[{ y: 126, color: "#f43f5e", etiqueta: "Diagnóstico clínico (126 mg/dL)" }]}
        diagnosticoX={anioDiagnostico}
      />
      <GraficaLineas titulo="Secreción de insulina [HOMA-Beta]" datos={datos} lineas={unaLinea("homaBeta", "HOMA-Beta")} unidadY="% función" />
      <GraficaLineas
        titulo="Pérdida estructural celular beta"
        datos={datos}
        lineas={unaLinea("deficitBeta", "Déficit beta")}
        unidadY="% de déficit celular"
        referencias={[
          { y: 40, color: "#fb923c", etiqueta: "Déficit 40 % (prediabetes)" },
          { y: 63, color: "#f43f5e", etiqueta: "Déficit 63 % (diagnóstico)" },
        ]}
        dominioY={[(min) => Math.floor(Math.min(min, 0) / 10) * 10, 70]}
      />
      <GraficaLineas titulo="Caída de sensibilidad a la insulina [S_I]" datos={datos} lineas={unaLinea("sensibilidad", "S_I")} unidadY="S_I" />
    </div>
  );
}

export function GraficaPreDiagnostico({ resultado, color }: { resultado: ResultadoEscenario; color: string }) {
  const datos: Fila[] = resultado.preDiagnostico.map((p) => ({ anio: p.anio, glucosa: p.glucosa.p50, rango: [p.glucosa.p10, p.glucosa.p90] }));
  return (
    <GraficaLineas
      titulo="Glucemia en ayunas antes del diagnóstico"
      datos={datos}
      lineas={[{ clave: "glucosa", nombre: "Glucemia mediana", color, banda: "rango" }]}
      unidadY="mg/dL"
      etiquetaX="Años respecto al diagnóstico (0 = diagnóstico)"
      referencias={[{ y: 126, color: "#f43f5e", etiqueta: "126 mg/dL" }]}
    />
  );
}

export function GraficaIncidencia({ resultados, horizonte }: { resultados: ResultadoEscenario[]; horizonte: number }) {
  const datos: Fila[] = resultados[0].serie.map((punto, k) => {
    const fila: Fila = { anio: punto.anio };
    resultados.forEach((r) => (fila[`inc_${r.escenarioId}`] = r.serie[k].incidencia));
    return fila;
  });
  return (
    <GraficaLineas
      titulo={`Incidencia acumulada de diabetes a ${horizonte} años`}
      datos={datos}
      lineas={resultados.map((r, i) => ({ clave: `inc_${r.escenarioId}`, nombre: r.nombre, color: PALETA_ESCENARIOS[i % PALETA_ESCENARIOS.length], escalon: true }))}
      unidadY="% acumulado"
      etiquetaX="Años desde hoy"
      dominioY={[0, 100]}
      altura={300}
      leyenda
    />
  );
}

export function BarrasTiempoLibre({ resultados, horizonte }: { resultados: ResultadoEscenario[]; horizonte: number }) {
  const ejes = useEjes();
  const datos = resultados.map((r, i) => ({
    nombre: r.nombre,
    anios: r.tiempoLibreAnios,
    etiqueta: r.sinDiabetesEnHorizonte ? `> ${horizonte} años (sin diabetes)` : `${r.tiempoLibreAnios.toFixed(1)} años`,
    color: PALETA_ESCENARIOS[i % PALETA_ESCENARIOS.length],
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={datos} margin={{ top: 28, right: 14, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ejes.rejilla} vertical={false} />
        <XAxis dataKey="nombre" stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} />
        <YAxis stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} domain={[0, horizonte]} label={{ value: "Años sin diabetes", angle: -90, position: "insideLeft", fontSize: 11, fill: ejes.texto }} />
        <Tooltip contentStyle={{ backgroundColor: ejes.fondo, border: `1px solid ${ejes.borde}`, borderRadius: 8, fontSize: 12 }} formatter={(valor) => [`${redondear(valor, 1)} años`, "Tiempo libre"]} />
        <ReferenceLine y={horizonte} stroke={ejes.texto} strokeDasharray="6 4" label={{ value: `Horizonte máximo de simulación (${horizonte} años)`, position: "insideTopLeft", fontSize: 10, fill: ejes.texto }} />
        <Bar
          dataKey="anios"
          isAnimationActive={false}
          maxBarSize={110}
          shape={(props: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
            const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props;
            const d = datos[index];
            return (
              <g>
                <rect x={x} y={y} width={width} height={height} fill={d.color} fillOpacity={0.85} stroke={ejes.linea1} strokeWidth={1} />
                <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fill={ejes.linea1}>{d.etiqueta}</text>
              </g>
            );
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HistogramaDiagnostico({ resultado, color, horizonte }: { resultado: ResultadoEscenario; color: string; horizonte: number }) {
  const ejes = useEjes();
  const ancho = horizonte > 12 ? 1 : 0.5;
  const nBins = Math.ceil(horizonte / ancho);
  const conteos = Array.from({ length: nBins }, (_, i) => ({ inicio: i * ancho, n: 0 }));
  resultado.tiemposDiagnostico.forEach((t) => {
    const i = Math.min(nBins - 1, Math.floor(t / ancho));
    conteos[i].n += 1;
  });
  const datos = conteos.map((c) => ({ rango: `${c.inicio.toFixed(1)}`, n: c.n }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} margin={{ top: 8, right: 14, left: 0, bottom: 14 }} barCategoryGap={1}>
        <CartesianGrid strokeDasharray="3 3" stroke={ejes.rejilla} vertical={false} />
        <XAxis dataKey="rango" stroke={ejes.linea} tick={{ fontSize: 10, fill: ejes.texto }} interval="preserveStartEnd" label={{ value: "Años hasta el diagnóstico", position: "insideBottom", offset: -8, fontSize: 11, fill: ejes.texto }} />
        <YAxis stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} allowDecimals={false} label={{ value: "Trayectorias", angle: -90, position: "insideLeft", fontSize: 11, fill: ejes.texto }} />
        <Tooltip contentStyle={{ backgroundColor: ejes.fondo, border: `1px solid ${ejes.borde}`, borderRadius: 8, fontSize: 12 }} formatter={(valor) => [valor, "Trayectorias"]} labelFormatter={(v) => `Desde el año ${v}`} />
        <Bar dataKey="n" fill={color} fillOpacity={0.85} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
