import type { Etapa } from "../types";
import { tinta } from "./ui";

export const COLOR_ETAPA: Record<Etapa, string> = {
  sano: "#3fb98a",
  resistencia: "#facc15",
  prediabetes: "#fb923c",
  diabetes: "#f43f5e",
};

const NOMBRES: Record<Etapa, string> = {
  sano: "Sano",
  resistencia: "Resistencia a la insulina",
  prediabetes: "Prediabetes",
  diabetes: "Diabetes tipo 2",
};

export function StageBadge({ etapa, className = "" }: { etapa: Etapa; className?: string }) {
  const color = COLOR_ETAPA[etapa];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
      style={{ color: tinta(color), borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, }} />
      {NOMBRES[etapa]}
    </span>
  );
}
