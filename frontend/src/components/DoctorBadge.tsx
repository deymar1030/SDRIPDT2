/** Ícono simple de doctor/a (figura + bata + estetoscopio), construido con
 *  formas básicas en vez de una ilustración con licencia ajena. */
export function DoctorBadge({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-label="Icono de médico">
      <circle cx="24" cy="24" r="23" fill="#0b3a4f" stroke="#22d3ee" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M11 41 Q11 27 24 27 Q37 27 37 41 Z" fill="#e6f4ff" />
      <circle cx="24" cy="17" r="8" fill="#e6f4ff" />
      <path d="M18 28 Q24 35 30 28" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16.5" cy="31" r="2" fill="#0891b2" />
      <path d="M16.5 33 Q16.5 39 22 39" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="39" r="2.4" fill="none" stroke="#0891b2" strokeWidth="2" />
    </svg>
  );
}
