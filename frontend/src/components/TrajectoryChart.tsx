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
import { useTema } from "../tema/TemaContext";
import { tinta } from "./ui";

export const PALETA_ESCENARIOS = ["#22d3ee", "#a78bfa", "#f472b6", "#34d399"];

interface Props {
  resultados: ResultadoEscenario[];
  marcador: "glucosa" | "insulina" | "homaIR" | "reserva";
  unidad: string;
}

interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

function TooltipPersonalizado({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const medianas = payload.filter((p) => p.dataKey.startsWith("mediana_"));
  return (
    <div className="rounded-lg border border-hud-borde-fuerte bg-hud-fondo/95 p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-white">Año {label}</p>
      {medianas.map((p) => (
        <p key={p.dataKey} style={{ color: tinta(p.color) }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
}

export function TrajectoryChart({ resultados, marcador, unidad }: Props) {
  const anios = resultados[0]?.resumenAnual.map((p) => p.anio) ?? [];
  const data = anios.map((anio) => {
    const fila: Record<string, number | number[]> = { anio };
    resultados.forEach((r) => {
      const punto = r.resumenAnual.find((p) => p.anio === anio);
      if (!punto) return;
      const banda = punto[marcador];
      fila[`rango_${r.escenarioId}`] = [banda.p10, banda.p90];
      fila[`mediana_${r.escenarioId}`] = banda.p50;
    });
    return fila;
  });

  const claro = useTema().tema === "light";
  const ejes = claro
    ? { rejilla: "rgba(14,116,144,0.14)", linea: "rgba(14,116,144,0.3)", texto: "#48607f", cursor: "rgba(8,145,178,0.45)" }
    : { rejilla: "rgba(56,189,248,0.12)", linea: "rgba(56,189,248,0.25)", texto: "#8fb3d9", cursor: "rgba(34,211,238,0.4)" };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ejes.rejilla} vertical={false} />
        <XAxis dataKey="anio" stroke={ejes.linea} tick={{ fontSize: 12, fill: ejes.texto }} label={{ value: "Año", position: "insideBottom", offset: -3, fontSize: 12, fill: ejes.texto }} />
        <YAxis stroke={ejes.linea} tick={{ fontSize: 12, fill: ejes.texto }} label={{ value: unidad, angle: -90, position: "insideLeft", fontSize: 12, fill: ejes.texto }} />
        <Tooltip content={<TooltipPersonalizado />} cursor={{ stroke: ejes.cursor }} />
        <Legend wrapperStyle={{ fontSize: 12, color: ejes.texto }} />
        {resultados.map((r, i) => {
          const color = PALETA_ESCENARIOS[i % PALETA_ESCENARIOS.length];
          return (
            <Area
              key={`rango_${r.escenarioId}`}
              dataKey={`rango_${r.escenarioId}`}
              stroke="none"
              fill={color}
              fillOpacity={0.16}
              legendType="none"
              isAnimationActive={false}
            />
          );
        })}
        {resultados.map((r, i) => {
          const color = PALETA_ESCENARIOS[i % PALETA_ESCENARIOS.length];
          return (
            <Line
              key={`mediana_${r.escenarioId}`}
              dataKey={`mediana_${r.escenarioId}`}
              name={r.nombre}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
