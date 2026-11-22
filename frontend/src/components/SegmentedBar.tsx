import type { Etapa } from "../types";
import { COLOR_ETAPA } from "./StageBadge";

const ORDEN: Etapa[] = ["sano", "resistencia", "prediabetes", "diabetes"];
const NOMBRE: Record<Etapa, string> = { sano: "Sano", resistencia: "Resistencia", prediabetes: "Prediabetes", diabetes: "Diabetes" };

/** Reparto de las trayectorias entre etapas: una barra fina y, debajo, la leyenda con los porcentajes. */
export function SegmentedBar({ pct, leyenda = true }: { pct: Record<Etapa, number>; leyenda?: boolean }) {
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-[2px] bg-hud-panel-2" role="img" aria-label={ORDEN.map((e) => `${NOMBRE[e]} ${Math.round(pct[e] ?? 0)}%`).join(", ")}>
        {ORDEN.map((etapa) => {
          const valor = pct[etapa] ?? 0;
          if (valor <= 0) return null;
          return <div key={etapa} style={{ width: `${valor}%`, backgroundColor: COLOR_ETAPA[etapa] }} className="transition-all duration-500" title={`${NOMBRE[etapa]}: ${valor.toFixed(1)}%`} />;
        })}
      </div>
      {leyenda && (
        <ul className="cifras mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-hud-suave">
          {ORDEN.filter((e) => (pct[e] ?? 0) > 0).map((e) => (
            <li key={e} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: COLOR_ETAPA[e] }} />
              {NOMBRE[e]} {Math.round(pct[e])} %
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
