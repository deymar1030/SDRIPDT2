/** Silueta humana holográfica con línea de escaneo y trazo de ECG — la
 *  identidad visual del sistema (acceso, landing). El tamaño lo fija el
 *  contenedor mediante `className` (alto y ancho). */
export function SiluetaHolografica({ className = "", ecg = true }: { className?: string; ecg?: boolean }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="absolute inset-0" style={{ filter: "drop-shadow(0 0 12px #1d4ed8) drop-shadow(0 0 26px #7dd3fc55)" }}>
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #7dd3fcee 0%, #1d4ed8cc 70%, #1d4ed888 100%)",
            WebkitMaskImage: "url(/images/silueta-humana.svg)",
            maskImage: "url(/images/silueta-humana.svg)",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-[-14px] top-0 h-full overflow-hidden">
        <div
          className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-[#67e8f980] to-transparent"
          style={{ animation: "escaneo 5s linear infinite" }}
        />
      </div>
      {ecg && <svg
        className="pointer-events-none absolute top-[22%] h-10"
        style={{ left: "-55%", width: "210%" }}
        viewBox="0 0 228 40"
        preserveAspectRatio="none"
        fill="none"
      >
        <polyline
          points="0,20 92,20 100,20 106,5 114,35 121,11 126,20 228,20"
          stroke="#67e8f9"
          strokeWidth="1.6"
          strokeLinejoin="round"
          style={{ strokeDasharray: 260, animation: "ecg 2.4s linear infinite", filter: "drop-shadow(0 0 4px #22d3ee)" }}
        />
      </svg>}
    </div>
  );
}
