import type { ButtonHTMLAttributes, ComponentProps, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

/** Color de estado (hex) apto para TEXTO en ambos temas: en claro se
 *  oscurece mezclándolo con la tinta del tema. */
export function tinta(color: string) {
  return `color-mix(in oklab, ${color} var(--tinta-pct), var(--color-white))`;
}

/* ---------------- Panel ---------------- */
interface PanelProps {
  titulo?: string;
  descripcion?: string;
  acciones?: ReactNode;
  /** Dibuja el recuadro; por defecto es una sección separada por una línea fina. */
  caja?: boolean;
  /** Se conserva por compatibilidad; ya no dibuja nada. */
  esquinas?: boolean;
  className?: string;
  children: ReactNode;
}

export function Panel({ titulo, descripcion, acciones, caja = false, className = "", children }: PanelProps) {
  const base = caja ? "rounded-md border border-hud-borde bg-hud-panel p-5" : "border-t border-hud-borde-fuerte pt-5";
  return (
    <section className={`${base} ${className}`}>
      {(titulo || acciones) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-64">
            {titulo && <h2 className="text-xl text-white">{titulo}</h2>}
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
  primario: "bg-hud-acento text-hud-fondo hover:brightness-110",
  secundario: "border border-hud-borde-fuerte text-hud-texto hover:bg-hud-panel-2",
  fantasma: "text-hud-suave hover:bg-hud-panel-2 hover:text-hud-texto",
  peligro: "border border-rose-400/50 text-rose-400 hover:bg-rose-400/10",
};
const TAMANOS: Record<Tamano, string> = {
  sm: "px-3 py-1.5 text-[13px] gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

export function claseBoton(variante: Variante = "primario", tamano: Tamano = "md", extra = "") {
  return `inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hud-acento disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${extra}`;
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

/* ---------------- Pestañas y control segmentado ---------------- */
interface OpcionTab<T extends string | number> {
  clave: T;
  etiqueta: ReactNode;
}

/** Pestañas con línea inferior, para cambiar de vista dentro de una sección. */
export function Pestanas<T extends string | number>({ opciones, activa, onCambio, etiqueta }: { opciones: OpcionTab<T>[]; activa: T; onCambio: (clave: T) => void; etiqueta?: string }) {
  return (
    <div role="tablist" aria-label={etiqueta} className="flex flex-wrap gap-x-5 gap-y-1 border-b border-hud-borde">
      {opciones.map((o) => (
        <button
          key={String(o.clave)}
          role="tab"
          aria-selected={o.clave === activa}
          onClick={() => onCambio(o.clave)}
          className={`-mb-px border-b-2 pb-2 pt-1 text-sm transition-colors ${
            o.clave === activa ? "border-hud-acento font-medium text-white" : "border-transparent text-hud-suave hover:text-white"
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

/** Interruptor de dos o tres opciones excluyentes (por ejemplo, el modo de una gráfica). */
export function Segmentado<T extends string>({ opciones, activa, onCambio, etiqueta }: { opciones: OpcionTab<T>[]; activa: T; onCambio: (clave: T) => void; etiqueta?: string }) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex overflow-hidden rounded-md border border-hud-borde-fuerte">
      {opciones.map((o, i) => (
        <button
          key={o.clave}
          aria-pressed={o.clave === activa}
          onClick={() => onCambio(o.clave)}
          className={`px-3 py-1.5 text-[13px] transition-colors ${i > 0 ? "border-l border-hud-borde-fuerte" : ""} ${
            o.clave === activa ? "bg-hud-acento text-hud-fondo" : "text-hud-suave hover:bg-hud-panel-2 hover:text-white"
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

/** Cuadrito de color que identifica a un escenario o una etapa. */
export function Muestra({ color, className = "" }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-[2px] ${className}`} style={{ backgroundColor: tinta(color) }} />;
}

/* ---------------- Formularios ---------------- */
const claseControl =
  "w-full rounded-md border border-hud-borde-fuerte bg-hud-panel px-3 py-2 text-sm text-hud-texto placeholder:text-hud-tenue transition-colors focus:border-hud-acento focus:outline-none focus:ring-2 focus:ring-hud-acento/20 disabled:opacity-60";

export function Unidad({ children }: { children: ReactNode }) {
  return <span className="font-normal text-hud-tenue">{children}</span>;
}

export function Campo({ etiqueta, ayuda, htmlFor, children, className = "" }: { etiqueta: ReactNode; ayuda?: ReactNode; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-hud-texto">
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
  const estilos = tipo === "error" ? "border-rose-400 bg-rose-400/10 text-rose-300" : "border-emerald-400 bg-emerald-400/10 text-emerald-200";
  const Icono = tipo === "error" ? AlertCircle : CheckCircle2;
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex items-start gap-2 border-l-4 px-3 py-2 text-sm ${estilos}`}>
      <Icono size={16} className="mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-hud-suave">
      <Loader2 size={16} className="animate-spin" /> {texto}
    </div>
  );
}

export function Vacio({ icono, titulo, descripcion, accion }: { icono?: ReactNode; titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5 py-8">
      {icono && <div className="text-hud-tenue">{icono}</div>}
      <p className="font-serif text-lg font-semibold text-white">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-hud-suave">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

/* ---------------- Tabla ---------------- */
export const claseTabla = {
  tabla: "w-full text-sm",
  encabezado: "text-left text-xs text-hud-tenue",
  celdaEncabezado: "border-b border-hud-borde-fuerte pb-2 pr-4 font-medium",
  fila: "border-b border-hud-borde transition-colors hover:bg-hud-panel-2/60",
  celda: "py-3 pr-4 align-middle",
};

export function iniciales(nombre: string) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function Avatar({ nombre, tamano = 36 }: { nombre: string; tamano?: number }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full border border-hud-borde-fuerte bg-hud-panel-2 font-medium text-hud-suave"
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.36 }}
    >
      {iniciales(nombre)}
    </div>
  );
}
