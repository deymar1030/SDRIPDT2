import type { Etapa } from "../types";
import { Muestra } from "./ui";

export const COLOR_ETAPA: Record<Etapa, string> = {
  sano: "#2f7d5b",
  resistencia: "#b7791f",
  prediabetes: "#c2571a",
  diabetes: "#b42318",
};

const NOMBRES: Record<Etapa, string> = {
  sano: "Sano",
  resistencia: "Resistencia a la insulina",
  prediabetes: "Prediabetes",
  diabetes: "Diabetes tipo 2",
};

export function StageBadge({ etapa, className = "" }: { etapa: Etapa; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-hud-texto ${className}`}>
      <Muestra color={COLOR_ETAPA[etapa]} />
      {NOMBRES[etapa]}
    </span>
  );
}
