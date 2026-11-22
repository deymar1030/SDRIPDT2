import type { ReactNode } from "react";
import { tinta } from "./ui";

interface Props {
  etiqueta: string;
  valor: ReactNode;
  nota?: string;
  icono?: ReactNode;
  /** Color de acento del ícono y del valor (hex). */
  color?: string;
}

export function StatTile({ etiqueta, valor, nota, icono, color = "#34b4c4" }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-hud-borde bg-hud-panel/80 p-5 shadow-[var(--sombra-panel)] backdrop-blur">
      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl" style={{ backgroundColor: `${color}26` }} />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-hud-suave">{etiqueta}</span>
        {icono && (
          <span className="rounded-lg border p-1.5" style={{ color: tinta(color), borderColor: `${color}44`, backgroundColor: `${color}14` }}>
            {icono}
          </span>
        )}
      </div>
      <p className="mt-3 font-mono text-3xl font-bold text-white" style={{ }}>
        {valor}
      </p>
      {nota && <p className="mt-1 text-xs text-hud-tenue">{nota}</p>}
    </div>
  );
}
