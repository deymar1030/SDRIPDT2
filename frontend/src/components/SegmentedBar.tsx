import type { Etapa } from "../types";
import { COLOR_ETAPA } from "./StageBadge";

const ORDEN: Etapa[] = ["sano", "resistencia", "prediabetes", "diabetes"];
const NOMBRE: Record<Etapa, string> = { sano: "Sano", resistencia: "Resistencia", prediabetes: "Prediabetes", diabetes: "Diabetes" };

export function SegmentedBar({ pct }: { pct: Record<Etapa, number> }) {
  return (
    <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded-full bg-white/5" role="img" aria-label={ORDEN.map((e) => `${NOMBRE[e]} ${Math.round(pct[e] ?? 0)}%`).join(", ")}>
      {ORDEN.map((etapa) => {
        const valor = pct[etapa] ?? 0;
        if (valor <= 0) return null;
        return (
          <div
            key={etapa}
            style={{ width: `${valor}%`, backgroundColor: COLOR_ETAPA[etapa] }}
            className="flex items-center justify-center text-[10px] font-bold text-slate-950 transition-all duration-500"
            title={`${NOMBRE[etapa]}: ${valor.toFixed(1)}%`}
          >
            {valor >= 12 ? `${Math.round(valor)}%` : ""}
          </div>
        );
      })}
    </div>
  );
}
