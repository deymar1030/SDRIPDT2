/** Ilustración del tipo de resultado que muestra el simulador (no son datos de un paciente). */
export function CurvaEjemplo({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      <svg viewBox="0 0 360 170" className="w-full" role="img" aria-label="Ilustración: la glucemia sube con un quiebre sin cambios y se mantiene con intervención">
        <g className="stroke-hud-borde-fuerte" strokeWidth="1">
          <line x1="36" y1="140" x2="350" y2="140" />
          <line x1="36" y1="10" x2="36" y2="140" />
          <line x1="36" y1="48" x2="350" y2="48" strokeDasharray="4 4" />
        </g>
        <path d="M36 118 C 120 114, 190 106, 240 98 S 290 84, 306 60 L 316 22" fill="none" className="stroke-rose-400" strokeWidth="2.2" />
        <path d="M36 118 C 120 117, 200 114, 350 108" fill="none" className="stroke-sky-300" strokeWidth="2.2" />
        <text x="40" y="43" className="fill-hud-tenue" fontSize="10">126 mg/dL: diagnóstico</text>
        <text x="190" y="82" className="fill-rose-400" fontSize="11">sin cambios</text>
        <text x="220" y="129" className="fill-sky-300" fontSize="11">con intervención</text>
        <text x="300" y="158" className="fill-hud-tenue" fontSize="10">años</text>
      </svg>
      <figcaption className="mt-2 text-xs text-hud-tenue">Ilustración del tipo de resultado; no corresponde a un paciente.</figcaption>
    </figure>
  );
}
