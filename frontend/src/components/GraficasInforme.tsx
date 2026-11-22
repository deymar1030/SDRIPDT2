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
import { useEjes, usePaleta } from "./temaGraficas";

type Fila = Record<string, number | number[]>;

function redondear(valor: unknown, decimales = 2) {
  return typeof valor === "number" ? Number(valor.toFixed(decimales)) : valor;
}

interface Referencia {
  y: number;
  tono: "alerta" | "aviso";
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

export function GraficaLineas({ titulo, datos, lineas, unidadY, referencias = [], diagnosticoX, dominioY, etiquetaX = "Años de simulación", altura = 250, leyenda = false }: MiniProps) {
  const ejes = useEjes();
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-white">{titulo}</p>
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={datos} margin={{ top: 8, right: 14, left: 0, bottom: leyenda ? 46 : 14 }}>
          <CartesianGrid stroke={ejes.rejilla} vertical={false} />
          <XAxis dataKey="anio" type="number" domain={["dataMin", "dataMax"]} stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} tickFormatter={(v) => String(redondear(v, 1))} label={{ value: etiquetaX, position: "insideBottom", offset: -8, fontSize: 11, fill: ejes.texto }} />
          <YAxis stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} domain={dominioY ?? ["auto", "auto"]} tickFormatter={(v) => String(redondear(v, 1))} label={{ value: unidadY, angle: -90, position: "insideLeft", fontSize: 11, fill: ejes.texto }} />
          <Tooltip
            contentStyle={{ backgroundColor: ejes.fondo, border: `1px solid ${ejes.borde}`, borderRadius: 4, fontSize: 12 }}
            labelFormatter={(v) => `Año ${redondear(v, 2)}`}
            formatter={(valor, nombre) => [Array.isArray(valor) ? `${redondear(valor[0], 1)} – ${redondear(valor[1], 1)}` : String(redondear(valor, 2)), nombre]}
          />
          {leyenda && <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, color: ejes.texto, bottom: 0 }} />}
          {referencias.map((r) => (
            <ReferenceLine key={r.etiqueta} y={r.y} stroke={ejes[r.tono]} strokeDasharray="5 4" ifOverflow="extendDomain" label={{ value: r.etiqueta, position: "insideTopLeft", fontSize: 10, fill: ejes[r.tono] }} />
          ))}
          {diagnosticoX != null && (
            <ReferenceLine x={diagnosticoX} stroke={ejes.alerta} strokeDasharray="2 3" label={{ value: `Diagnóstico (año ${redondear(diagnosticoX, 1)})`, position: "insideTopRight", fontSize: 10, fill: ejes.alerta }} />
          )}
          {lineas.map((l) => l.banda && (
            <Area key={`banda_${l.clave}`} dataKey={l.banda} stroke="none" fill={l.color ?? ejes.tinta} fillOpacity={0.14} legendType="none" isAnimationActive={false} name={`${l.nombre} (P10–P90)`} />
          ))}
          {lineas.map((l) => (
            <Line key={l.clave} dataKey={l.clave} name={l.nombre} type={l.escalon ? "stepAfter" : "linear"} stroke={l.color ?? ejes.tinta} strokeWidth={2} dot={false} isAnimationActive={false} />
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

  const ultimo = resultado.trayectoriaEjemplo[resultado.trayectoriaEjemplo.length - 1];
  const anioDiagnostico = individual ? (ultimo && ultimo.glucosa >= 126 ? ultimo.anio : null) : resultado.tiempoMedianoDiagnostico;

  const unaLinea = (clave: string, nombre: string): Linea[] => [{ clave, nombre, color, banda: individual ? undefined : `${clave}_r` }];

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 xl:grid-cols-2">
      <GraficaLineas
        titulo="a) Glucemia en ayunas, G(t)"
        datos={datos}
        lineas={unaLinea("glucosa", "Glucemia en ayunas")}
        unidadY="mg/dL"
        referencias={[{ y: 126, tono: "alerta", etiqueta: "Diagnóstico clínico (126 mg/dL)" }]}
        diagnosticoX={anioDiagnostico}
      />
      <GraficaLineas titulo="b) Secreción de insulina, HOMA-β" datos={datos} lineas={unaLinea("homaBeta", "HOMA-β")} unidadY="% de función" />
      <GraficaLineas
        titulo="c) Pérdida estructural de células β"
        datos={datos}
        lineas={unaLinea("deficitBeta", "Déficit beta")}
        unidadY="% de déficit celular"
        referencias={[
          { y: 40, tono: "aviso", etiqueta: "Déficit 40 % (prediabetes)" },
          { y: 63, tono: "alerta", etiqueta: "Déficit 63 % (diagnóstico)" },
        ]}
        dominioY={[(min) => Math.floor(Math.min(min, 0) / 10) * 10, 70]}
      />
      <GraficaLineas titulo="d) Sensibilidad a la insulina, S_I" datos={datos} lineas={unaLinea("sensibilidad", "S_I")} unidadY="S_I" />
    </div>
  );
}

export function GraficaPreDiagnostico({ resultado, color }: { resultado: ResultadoEscenario; color: string }) {
  const datos: Fila[] = resultado.preDiagnostico.map((p) => ({ anio: p.anio, glucosa: p.glucosa.p50, rango: [p.glucosa.p10, p.glucosa.p90] }));
  return (
    <GraficaLineas
      titulo="Glucemia mediana antes del diagnóstico"
      datos={datos}
      lineas={[{ clave: "glucosa", nombre: "Glucemia mediana", color, banda: "rango" }]}
      unidadY="mg/dL"
      etiquetaX="Años respecto al diagnóstico (0 = diagnóstico)"
      referencias={[{ y: 126, tono: "alerta", etiqueta: "126 mg/dL" }]}
    />
  );
}

export function GraficaIncidencia({ resultados, horizonte }: { resultados: ResultadoEscenario[]; horizonte: number }) {
  const paleta = usePaleta();
  const datos: Fila[] = resultados[0].serie.map((punto, k) => {
    const fila: Fila = { anio: punto.anio };
    resultados.forEach((r) => (fila[`inc_${r.escenarioId}`] = r.serie[k].incidencia));
    return fila;
  });
  return (
    <GraficaLineas
      titulo={`Incidencia acumulada de diabetes a ${horizonte} años`}
      datos={datos}
      lineas={resultados.map((r, i) => ({ clave: `inc_${r.escenarioId}`, nombre: r.nombre, color: paleta[i % paleta.length], escalon: true }))}
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
  const paleta = usePaleta();
  const datos = resultados.map((r, i) => ({
    nombre: r.nombre,
    anios: r.tiempoLibreAnios,
    etiqueta: r.sinDiabetesEnHorizonte ? `> ${horizonte} años` : `${r.tiempoLibreAnios.toFixed(1)} años`,
    color: paleta[i % paleta.length],
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={datos} margin={{ top: 28, right: 14, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={ejes.rejilla} vertical={false} />
        <XAxis dataKey="nombre" stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} />
        <YAxis stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} domain={[0, horizonte]} label={{ value: "Años sin diabetes", angle: -90, position: "insideLeft", fontSize: 11, fill: ejes.texto }} />
        <Tooltip contentStyle={{ backgroundColor: ejes.fondo, border: `1px solid ${ejes.borde}`, borderRadius: 4, fontSize: 12 }} formatter={(valor) => [`${redondear(valor, 1)} años`, "Tiempo libre"]} />
        <ReferenceLine y={horizonte} stroke={ejes.texto} strokeDasharray="5 4" label={{ value: `Horizonte máximo: ${horizonte} años`, position: "insideBottomLeft", fontSize: 10, fill: ejes.texto }} />
        <Bar
          dataKey="anios"
          isAnimationActive={false}
          maxBarSize={96}
          shape={(props: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
            const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props;
            const d = datos[index];
            return (
              <g>
                <rect x={x} y={y} width={width} height={height} fill={d.color} />
                <text x={x + width / 2} y={y - 7} textAnchor="middle" fontSize={12} fontWeight={500} fill={ejes.tinta}>{d.etiqueta}</text>
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
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={datos} margin={{ top: 8, right: 14, left: 0, bottom: 14 }} barCategoryGap={1}>
        <CartesianGrid stroke={ejes.rejilla} vertical={false} />
        <XAxis dataKey="rango" stroke={ejes.linea} tick={{ fontSize: 10, fill: ejes.texto }} interval="preserveStartEnd" label={{ value: "Años hasta el diagnóstico", position: "insideBottom", offset: -8, fontSize: 11, fill: ejes.texto }} />
        <YAxis stroke={ejes.linea} tick={{ fontSize: 11, fill: ejes.texto }} allowDecimals={false} label={{ value: "Trayectorias", angle: -90, position: "insideLeft", fontSize: 11, fill: ejes.texto }} />
        <Tooltip contentStyle={{ backgroundColor: ejes.fondo, border: `1px solid ${ejes.borde}`, borderRadius: 4, fontSize: 12 }} formatter={(valor) => [valor, "Trayectorias"]} labelFormatter={(v) => `Desde el año ${v}`} />
        <Bar dataKey="n" fill={color} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
