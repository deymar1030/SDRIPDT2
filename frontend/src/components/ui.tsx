import type { ButtonHTMLAttributes, ComponentProps, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

/** Color de nivel (hex) apto para TEXTO en ambos temas: en oscuro queda
 *  igual; en claro se oscurece mezclándolo con el azul marino del tema. */
export function tinta(color: string) {
  return `color-mix(in oklab, ${color} var(--tinta-pct), var(--color-white))`;
}

/* ---------------- Panel ---------------- */
interface PanelProps {
  titulo?: string;
  descripcion?: string;
  acciones?: ReactNode;
  esquinas?: boolean;
  className?: string;
  children: ReactNode;
}

/** Tarjeta base del sistema: fondo azul noche, borde cian tenue y, si se
 *  pide, las esquinas marcadas del panel metabólico. */
export function Panel({ titulo, descripcion, acciones, esquinas = false, className = "", children }: PanelProps) {
  return (
    <section className={`relative rounded-2xl border border-hud-borde bg-hud-panel/80 p-5 shadow-[var(--sombra-panel)] backdrop-blur ${className}`}>
      {esquinas && (
        <>
          <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 rounded-tl-2xl border-l-2 border-t-2 border-hud-acento/70" />
          <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 rounded-br-2xl border-b-2 border-r-2 border-hud-acento/70" />
        </>
      )}
      {(titulo || acciones) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-64">
            {titulo && <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">{titulo}</h2>}
            {descripcion && <p className="mt-1 text-sm text-hud-suave">{descripcion}</p>}
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------------- Botón ---------------- */
type Variante = "primario" | "secundario" | "fantasma" | "peligro";
type Tamano = "sm" | "md";

const VARIANTES: Record<Variante, string> = {
  primario:
    "bg-hud-acento text-slate-950 hover:bg-cyan-300 shadow-[0_0_18px_rgb(34_211_238/0.35)] hover:shadow-[0_0_24px_rgb(34_211_238/0.55)]",
  secundario: "border border-hud-borde-fuerte text-sky-100 hover:border-hud-acento hover:bg-hud-acento/10",
  fantasma: "text-hud-suave hover:bg-white/5 hover:text-white",
  peligro: "border border-rose-500/40 text-rose-300 hover:bg-rose-500/10",
};
const TAMANOS: Record<Tamano, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
};

export function claseBoton(variante: Variante = "primario", tamano: Tamano = "md", extra = "") {
  return `inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hud-acento disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${extra}`;
}

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  cargando?: boolean;
  icono?: ReactNode;
}

export function Boton({ variante = "primario", tamano = "md", cargando = false, icono, className = "", children, disabled, ...resto }: BotonProps) {
  return (
    <button className={claseBoton(variante, tamano, className)} disabled={disabled || cargando} {...resto}>
      {cargando ? <Loader2 size={tamano === "sm" ? 13 : 16} className="animate-spin" /> : icono}
      {children}
    </button>
  );
}

interface BotonEnlaceProps {
  to: string;
  variante?: Variante;
  tamano?: Tamano;
  icono?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function BotonEnlace({ to, variante = "primario", tamano = "md", icono, className = "", children }: BotonEnlaceProps) {
  return (
    <Link to={to} className={claseBoton(variante, tamano, className)}>
      {icono}
      {children}
    </Link>
  );
}

/* ---------------- Formularios ---------------- */
const claseControl =
  "w-full rounded-lg border border-hud-borde bg-hud-fondo/60 px-3 py-2 text-sm text-hud-texto placeholder:text-hud-tenue transition-colors focus:border-hud-acento focus:outline-none focus:ring-2 focus:ring-hud-acento/25 disabled:opacity-60";

/** Unidad dentro de una etiqueta en mayúsculas: conserva su grafía (µU/mL, mg/dL). */
export function Unidad({ children }: { children: ReactNode }) {
  return <span className="normal-case tracking-normal">{children}</span>;
}

export function Campo({ etiqueta, ayuda, htmlFor, children, className = "" }: { etiqueta: ReactNode; ayuda?: ReactNode; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-hud-suave">
        {etiqueta}
      </label>
      {children}
      {ayuda && <p className="mt-1 text-xs text-hud-tenue">{ayuda}</p>}
    </div>
  );
}

export function Entrada(props: ComponentProps<"input">) {
  return <input {...props} className={`${claseControl} ${props.className ?? ""}`} />;
}

export function Selector(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${claseControl} ${props.className ?? ""}`} />;
}

export function AreaTexto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${claseControl} ${props.className ?? ""}`} />;
}

/* ---------------- Mensajes y estados ---------------- */
export function Aviso({ tipo, children }: { tipo: "error" | "exito"; children: ReactNode }) {
  const estilos =
    tipo === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  const Icono = tipo === "error" ? AlertCircle : CheckCircle2;
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${estilos}`}>
      <Icono size={16} className="mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-hud-suave">
      <Loader2 size={16} className="animate-spin text-hud-acento" /> {texto}
    </div>
  );
}

export function Vacio({ icono, titulo, descripcion, accion }: { icono: ReactNode; titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="rounded-full border border-hud-borde bg-hud-acento/10 p-3 text-hud-acento">{icono}</div>
      <p className="font-semibold text-white">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-hud-suave">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

/* ---------------- Tabla ---------------- */
export const claseTabla = {
  tabla: "w-full text-sm",
  encabezado: "text-left text-[11px] uppercase tracking-wider text-hud-tenue",
  celdaEncabezado: "pb-3 pr-3 font-medium",
  fila: "border-t border-hud-borde transition-colors hover:bg-hud-acento/5",
  celda: "py-3 pr-3",
};

export function iniciales(nombre: string) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function Avatar({ nombre, tamano = 36 }: { nombre: string; tamano?: number }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full border border-hud-acento/40 bg-hud-acento/10 font-semibold text-cyan-200"
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.36 }}
    >
      {iniciales(nombre)}
    </div>
  );
}
