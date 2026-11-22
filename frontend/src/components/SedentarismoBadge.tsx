import type { Sedentarismo } from "../types";
import { COLOR_SEDENTARISMO, NOMBRE_SEDENTARISMO } from "../lib/perfil";
import { Muestra } from "./ui";

export function SedentarismoBadge({ nivel, className = "" }: { nivel: Sedentarismo; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-hud-texto ${className}`}>
      <Muestra color={COLOR_SEDENTARISMO[nivel]} />
      Sedentarismo {NOMBRE_SEDENTARISMO[nivel].toLowerCase()}
    </span>
  );
}
