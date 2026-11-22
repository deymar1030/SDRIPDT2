import type { Sedentarismo } from "../types";
import { COLOR_SEDENTARISMO, NOMBRE_SEDENTARISMO } from "../lib/perfil";
import { tinta } from "./ui";

export function SedentarismoBadge({ nivel, className = "" }: { nivel: Sedentarismo; className?: string }) {
  const color = COLOR_SEDENTARISMO[nivel];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
      style={{ color: tinta(color), borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, }} />
      Sedentarismo {NOMBRE_SEDENTARISMO[nivel].toLowerCase()}
    </span>
  );
}
