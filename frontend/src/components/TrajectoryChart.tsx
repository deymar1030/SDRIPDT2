import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ResultadoEscenario } from "../types";
import { useEjes, usePaleta } from "./temaGraficas";

interface Props {
  resultados: ResultadoEscenario[];
  marcador: "glucosa" | "insulina" | "homaIR" | "homaBeta" | "deficitBeta" | "sensibilidad";
  unidad: string;
}

export function TrajectoryChart({ resultados, marcador, unidad }: Props) {
  const ejes = useEjes();
  const paleta = usePaleta();
  const anios = resultados[0]?.serie.map((p) => p.anio) ?? [];
  const data = anios.map((anio) => {
    const fila: Record<string, number | number[]> = { anio };
    resultados.forEach((r) => {
      const punto = r.serie.find((p) => p.anio === anio);
      if (!punto) return;
      const banda = punto[marcador];
      fila[`rango_${r.escenarioId}`] = [banda.p10, banda.p90];
      fila[`mediana_${r.escenarioId}`] = banda.p50;
    });
    return fila;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 14 }}>
        <CartesianGrid stroke={ejes.rejilla} vertical={false} />
        <XAxis dataKey="anio" type="number" domain={["dataMin", "dataMax"]} stroke={ejes.linea} tick={{ fontSize: 12, fill: ejes.texto }} label={{ value: "Años desde hoy", position: "insideBottom", offset: -8, fontSize: 12, fill: ejes.texto }} />
        <YAxis stroke={ejes.linea} tick={{ fontSize: 12, fill: ejes.texto }} label={{ value: unidad, angle: -90, position: "insideLeft", fontSize: 12, fill: ejes.texto }} />
        <Tooltip
          contentStyle={{ backgroundColor: ejes.fondo, border: `1px solid ${ejes.borde}`, borderRadius: 4, fontSize: 12 }}
          labelFormatter={(v) => `Año ${typeof v === "number" ? Number(v.toFixed(2)) : v}`}
          formatter={(valor, nombre) => [Array.isArray(valor) ? `${Number(valor[0]).toFixed(1)} – ${Number(valor[1]).toFixed(1)}` : typeof valor === "number" ? valor.toFixed(1) : String(valor), nombre]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: ejes.texto, paddingTop: 8 }} />
        {resultados.map((r, i) => (
          <Area key={`rango_${r.escenarioId}`} dataKey={`rango_${r.escenarioId}`} stroke="none" fill={paleta[i % paleta.length]} fillOpacity={0.14} legendType="none" isAnimationActive={false} name={`${r.nombre} (P10–P90)`} />
        ))}
        {resultados.map((r, i) => (
          <Line key={`mediana_${r.escenarioId}`} dataKey={`mediana_${r.escenarioId}`} name={r.nombre} stroke={paleta[i % paleta.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
