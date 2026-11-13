import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Apple,
  Bike,
  CalendarRange,
  Check,
  CupSoda,
  Dumbbell,
  Flame,
  Footprints,
  Info,
  Salad,
  Sigma,
  Sofa,
  Utensils,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";
import { Boton, Entrada, tinta } from "./ui";
import {
  NOMBRE_INTENSIDAD,
  PLANTILLAS,
  UMBRAL_MET_MIN_OMS,
  calcularEfecto,
  hayIntervencion,
  nivelDesdeParametros,
  pesoDelPaciente,
} from "../lib/intervencion";
import type { DatosEscenario, Escenario, IntensidadEjercicio, NivelIntervencion, Paciente, ParametrosIntervencion } from "../types";

/* ---------------- opciones con ícono ---------------- */

const OPCIONES_PLANTILLA: { nivel: Exclude<NivelIntervencion, "personalizada">; titulo: string; texto: string; icono: typeof Sofa; color: string }[] = [
  { nivel: "nula", titulo: "Sin cambios", texto: "Sigue con sus hábitos", icono: Sofa, color: "#f43f5e" },
  { nivel: "moderada", titulo: "Moderada", texto: "−300 kcal · caminar 5×30", icono: Footprints, color: "#facc15" },
  { nivel: "intensiva", titulo: "Intensiva", texto: "−500 kcal · bici 5×45", icono: Flame, color: "#34d399" },
];

const OPCIONES_DIETA: { kcal: number; titulo: string; icono: typeof Utensils }[] = [
  { kcal: 0, titulo: "Come como siempre", icono: Utensils },
  { kcal: 150, titulo: "Sin gaseosas ni jugos", icono: CupSoda },
  { kcal: 300, titulo: "Porciones más pequeñas", icono: Salad },
  { kcal: 500, titulo: "Plan hipocalórico", icono: Apple },
];

const OPCIONES_INTENSIDAD: { valor: IntensidadEjercicio; icono: typeof Bike; met: string }[] = [
  { valor: "ligera", icono: Footprints, met: "3.5 MET" },
  { valor: "moderada", icono: Bike, met: "6 MET" },
  { valor: "vigorosa", icono: Flame, met: "8.5 MET" },
];

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

/* ---------------- piezas ---------------- */

function Tarjeta({ icono, titulo, color, children, extra }: { icono: ReactNode; titulo: string; color: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="rounded-xl border border-hud-borde bg-hud-fondo/40 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border" style={{ color: tinta(color), borderColor: `${color}55`, backgroundColor: `${color}18` }}>
            {icono}
          </span>
          <h3 className="font-semibold text-white">{titulo}</h3>
        </div>
        {extra}
      </header>
      {children}
    </section>
  );
}

function Opcion({ activa, onClick, icono, titulo, detalle }: { activa: boolean; onClick: () => void; icono: ReactNode; titulo: string; detalle?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
        activa ? "border-hud-acento bg-hud-acento/12 text-white" : "border-hud-borde text-hud-suave hover:border-hud-borde-fuerte hover:text-white"
      }`}
    >
      <span className={activa ? "text-hud-acento" : ""}>{icono}</span>
      <span className="text-[11px] font-medium leading-tight">{titulo}</span>
      {detalle && <span className="font-mono text-[10px] text-hud-tenue">{detalle}</span>}
    </button>
  );
}

function FilaEfecto({ simbolo, texto, valor, nota }: { simbolo: string; texto: string; valor: string; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hud-borde py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm text-hud-texto">
          <span className="font-mono text-xs text-hud-acento">{simbolo}</span> {texto}
        </p>
        {nota && <p className="text-[11px] text-hud-tenue">{nota}</p>}
      </div>
      <span className="whitespace-nowrap font-mono text-sm font-semibold text-white">{valor}</span>
    </div>
  );
}

const fmt = (n: number) => Math.round(n).toLocaleString("es-BO");

/* ---------------- modal ---------------- */

interface Props {
  abierto: boolean;
  escenario: Escenario | null; // null = nuevo
  paciente: Paciente;
  horizonte: number;
  onCerrar: () => void;
  onGuardar: (datos: DatosEscenario) => Promise<void>;
}

function parametrosIniciales(escenario: Escenario | null): ParametrosIntervencion {
  if (!escenario) return PLANTILLAS.moderada;
  if (escenario.parametros) return escenario.parametros;
  // Escenario antiguo (tabla fija): se parte de la plantilla de su mismo nivel.
  const nivel = escenario.nivel_intervencion === "personalizada" ? "moderada" : escenario.nivel_intervencion;
  return PLANTILLAS[nivel];
}

export function ModalEscenario({ abierto, escenario, paciente, horizonte, onCerrar, onGuardar }: Props) {
  const [nombre, setNombre] = useState("");
  const [p, setP] = useState<ParametrosIntervencion>(PLANTILLAS.moderada);
  const [diasMarcados, setDiasMarcados] = useState<boolean[]>(Array(7).fill(false));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refNombre = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const inicial = parametrosIniciales(escenario);
    setNombre(escenario?.nombre ?? "");
    setP(inicial);
    setDiasMarcados(DIAS.map((_, i) => i < inicial.ejercicio_dias));
    setError(null);
    setTimeout(() => refNombre.current?.focus(), 30);
  }, [abierto, escenario]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const { peso, estimado } = pesoDelPaciente(paciente.peso, paciente.imc);
  const efecto = calcularEfecto(p, peso);
  const nivel = nivelDesdeParametros(p);
  const activa = hayIntervencion(p);
  const cambiar = (parcial: Partial<ParametrosIntervencion>) => setP((prev) => ({ ...prev, ...parcial }));

  function aplicarPlantilla(n: Exclude<NivelIntervencion, "personalizada">) {
    const plantilla = PLANTILLAS[n];
    setP(plantilla);
    setDiasMarcados(DIAS.map((_, i) => i < plantilla.ejercicio_dias));
    if (!nombre.trim() || OPCIONES_PLANTILLA.some((o) => o.titulo === nombre || `Intervención ${o.titulo.toLowerCase()}` === nombre)) {
      setNombre(n === "nula" ? "Sin cambios" : `Intervención ${n}`);
    }
  }

  function alternarDia(i: number) {
    const nuevos = diasMarcados.map((v, j) => (j === i ? !v : v));
    setDiasMarcados(nuevos);
    const dias = nuevos.filter(Boolean).length;
    cambiar({ ejercicio_dias: dias, ejercicio_minutos: dias > 0 && p.ejercicio_minutos === 0 ? 30 : p.ejercicio_minutos });
  }

  async function guardar() {
    if (!nombre.trim()) {
      setError("Ponle un nombre al escenario.");
      refNombre.current?.focus();
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({ nombre: nombre.trim(), nivel_intervencion: nivel, parametros: p });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el escenario");
    } finally {
      setGuardando(false);
    }
  }

  const finIntervencion = p.duracion_anios ? Math.min(horizonte, p.inicio_anio + p.duracion_anios) : horizonte;
  const dietaElegida = OPCIONES_DIETA.find((o) => o.kcal === p.reduccion_kcal_dia);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm" onClick={onCerrar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-escenario"
        className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-hud-borde-fuerte bg-hud-panel shadow-2xl sm:rounded-2xl"
      >
        {/* Encabezado */}
        <header className="flex items-start justify-between gap-4 border-b border-hud-borde px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">{escenario ? "Editar escenario" : "Nuevo escenario"}</p>
            <h2 id="titulo-modal-escenario" className="mt-0.5 text-lg font-bold text-white">¿Qué hábitos cambiaría {paciente.nombre.split(" ")[0]}?</h2>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-hud-suave hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_300px]">
          {/* ---------- Columna de configuración ---------- */}
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label htmlFor="nombre-escenario" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-hud-suave">Nombre del escenario</label>
                <Entrada id="nombre-escenario" ref={refNombre} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Caminar después del trabajo" maxLength={120} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-hud-suave">Empezar desde una plantilla</p>
              <div className="grid grid-cols-3 gap-2">
                {OPCIONES_PLANTILLA.map(({ nivel: n, titulo, texto, icono: Icono, color }) => {
                  const sel = nivel === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => aplicarPlantilla(n)}
                      aria-pressed={sel}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                        sel ? "border-hud-acento bg-hud-acento/10" : "border-hud-borde hover:border-hud-borde-fuerte"
                      }`}
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ color: tinta(color), backgroundColor: `${color}1f` }}>
                        <Icono size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white">{titulo}</span>
                        <span className="block truncate text-[11px] text-hud-tenue">{texto}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {nivel === "personalizada" && (
                <p className="mt-2 text-xs text-hud-tenue">Ajustado a mano: se guardará como intervención personalizada.</p>
              )}
            </div>

            {/* Alimentación */}
            <Tarjeta
              icono={<UtensilsCrossed size={16} />}
              titulo="Alimentación"
              color="#fb923c"
              extra={<span className="font-mono text-lg font-bold text-white">{p.reduccion_kcal_dia > 0 ? `−${p.reduccion_kcal_dia}` : "0"} <span className="text-xs font-normal text-hud-tenue">kcal/día</span></span>}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {OPCIONES_DIETA.map(({ kcal, titulo, icono: Icono }) => (
                  <Opcion key={kcal} activa={p.reduccion_kcal_dia === kcal} onClick={() => cambiar({ reduccion_kcal_dia: kcal })} icono={<Icono size={18} />} titulo={titulo} detalle={kcal ? `−${kcal} kcal` : "0 kcal"} />
                ))}
              </div>
              <label htmlFor="kcal" className="mt-4 flex items-center justify-between text-xs text-hud-suave">
                <span>Ajuste fino {!dietaElegida && <span className="text-hud-acento">· personalizado</span>}</span>
                <span className="font-mono">0 — 1000</span>
              </label>
              <input id="kcal" type="range" min={0} max={1000} step={50} value={p.reduccion_kcal_dia} onChange={(e) => cambiar({ reduccion_kcal_dia: +e.target.value })} className="mt-1 w-full" />
            </Tarjeta>

            {/* Actividad física */}
            <Tarjeta
              icono={<Dumbbell size={16} />}
              titulo="Actividad física"
              color="#22d3ee"
              extra={
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    efecto.cumpleOms ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-hud-borde text-hud-tenue"
                  }`}
                  title={`Recomendación OMS ≈ ${UMBRAL_MET_MIN_OMS} MET·min por semana (150 min de actividad moderada)`}
                >
                  {efecto.cumpleOms && <Check size={12} />} {efecto.cumpleOms ? "Cumple OMS" : "Bajo la recomendación OMS"}
                </span>
              }
            >
              <p className="mb-2 text-xs text-hud-suave">Tipo de actividad</p>
              <div className="grid grid-cols-3 gap-2">
                {OPCIONES_INTENSIDAD.map(({ valor, icono: Icono, met }) => (
                  <Opcion key={valor} activa={p.ejercicio_intensidad === valor} onClick={() => cambiar({ ejercicio_intensidad: valor })} icono={<Icono size={18} />} titulo={NOMBRE_INTENSIDAD[valor]} detalle={met} />
                ))}
              </div>

              <p className="mb-2 mt-4 text-xs text-hud-suave">Días por semana · <b className="text-white">{p.ejercicio_dias}</b></p>
              <div className="flex gap-1.5">
                {DIAS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => alternarDia(i)}
                    aria-pressed={diasMarcados[i]}
                    aria-label={`Día ${i + 1}`}
                    className={`h-9 flex-1 rounded-lg border text-sm font-semibold transition-colors ${
                      diasMarcados[i] ? "border-hud-acento bg-hud-acento text-slate-950" : "border-hud-borde text-hud-suave hover:border-hud-borde-fuerte"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <label htmlFor="minutos" className="mt-4 flex items-center justify-between text-xs text-hud-suave">
                <span>Minutos por sesión</span>
                <span className="font-mono font-semibold text-white">{p.ejercicio_minutos} min</span>
              </label>
              <input id="minutos" type="range" min={0} max={120} step={5} value={p.ejercicio_minutos} onChange={(e) => cambiar({ ejercicio_minutos: +e.target.value })} className="mt-1 w-full" disabled={p.ejercicio_dias === 0} />
              <p className="mt-2 text-xs text-hud-tenue">
                {efecto.minutosSemana} min/semana · {fmt(efecto.metMinSemana)} MET·min · ≈ <b className="text-hud-texto">{fmt(efecto.gActSemana)} kcal/semana</b>
              </p>
            </Tarjeta>

            {/* Calendario */}
            <Tarjeta icono={<CalendarRange size={16} />} titulo="Cuándo se aplica" color="#a78bfa">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="inicio" className="flex items-center justify-between text-xs text-hud-suave">
                    <span>Empieza</span>
                    <span className="font-mono font-semibold text-white">{p.inicio_anio === 0 ? "hoy" : `año ${p.inicio_anio}`}</span>
                  </label>
                  <input id="inicio" type="range" min={0} max={Math.max(0, horizonte - 1)} value={Math.min(p.inicio_anio, Math.max(0, horizonte - 1))} onChange={(e) => cambiar({ inicio_anio: +e.target.value })} className="mt-1 w-full" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-hud-suave">
                    <span>Dura</span>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input type="checkbox" checked={p.duracion_anios === null} onChange={(e) => cambiar({ duracion_anios: e.target.checked ? null : 2 })} />
                      hasta el final
                    </label>
                  </div>
                  {p.duracion_anios !== null ? (
                    <>
                      <input id="duracion" type="range" min={1} max={20} value={p.duracion_anios} onChange={(e) => cambiar({ duracion_anios: +e.target.value })} className="mt-1 w-full" aria-label="Duración en años" />
                      <p className="text-right font-mono text-xs font-semibold text-white">{p.duracion_anios} {p.duracion_anios === 1 ? "año" : "años"}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-hud-tenue">Se mantiene todo el horizonte simulado.</p>
                  )}
                </div>
              </div>

              {/* Línea de tiempo */}
              <div className="mt-4">
                <div className="relative h-3 rounded-full bg-white/10" aria-hidden="true">
                  {activa && (
                    <div
                      className="absolute inset-y-0 rounded-full bg-[#a78bfa]"
                      style={{ left: `${(Math.min(p.inicio_anio, horizonte) / horizonte) * 100}%`, width: `${(Math.max(0, finIntervencion - p.inicio_anio) / horizonte) * 100}%`, boxShadow: "0 0 8px #a78bfa" }}
                    />
                  )}
                </div>
                <div className="mt-1 flex justify-between font-mono text-[10px] text-hud-tenue">
                  <span>hoy</span>
                  <span>año {horizonte}</span>
                </div>
                <p className="mt-1 text-xs text-hud-tenue">
                  {!activa
                    ? "Sin intervención: el paciente mantiene sus hábitos todo el horizonte."
                    : finIntervencion < horizonte
                      ? `Después del año ${finIntervencion} vuelve a sus hábitos de antes — así se ve qué pasa si abandona.`
                      : "La intervención se mantiene hasta el final de la simulación."}
                </p>
              </div>
            </Tarjeta>
          </div>

          {/* ---------- Efecto en el modelo ---------- */}
          <aside className="lg:sticky lg:top-0 lg:self-start">
            <div className="rounded-xl border border-hud-borde-fuerte bg-gradient-to-b from-hud-acento/10 to-hud-panel-2/40 p-4">
              <div className="flex items-center gap-2">
                <Sigma size={16} className="text-hud-acento" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Efecto en el modelo</p>
              </div>
              <p className="mt-1 text-xs text-hud-tenue">Así se traduce este escenario en cada semana simulada.</p>

              <div className="mt-3">
                <FilaEfecto simbolo="E_cal" texto="ingesta" valor={p.reduccion_kcal_dia ? `−${fmt(efecto.kcalDia)} kcal/día` : "sin cambio"} nota="se resta a cada sorteo de la Normal" />
                <FilaEfecto simbolo="G_act" texto="actividad" valor={efecto.gActSemana ? `+${fmt(efecto.gActSemana)} kcal/sem` : "sin cambio"} nota="días × min × MET × 3.5 × peso / 200" />
                <FilaEfecto simbolo="B_neto" texto="balance extra" valor={activa ? `${fmt(efecto.balanceSemana)} kcal/sem` : "0"} nota={activa ? `≈ ${efecto.kgPorMes.toFixed(2)} kg de grasa por mes (7700 kcal = 1 kg)` : undefined} />
                <FilaEfecto simbolo="R7" texto="recuperación" valor={`${Math.round(efecto.dosisR7 * 100)} % de k7`} nota="mitad por dieta (máx. −500 kcal), mitad por ejercicio (máx. OMS)" />
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-hud-acento transition-all" style={{ width: `${efecto.dosisR7 * 100}%`, boxShadow: "0 0 8px #22d3ee" }} />
              </div>

              <p className="mt-4 flex items-start gap-1.5 text-[11px] text-hud-tenue">
                <Info size={13} className="mt-px flex-shrink-0" />
                <span>
                  Peso usado: <b className="text-hud-texto">{peso} kg</b>
                  {estimado ? " (estimado con el IMC y una talla de referencia de 1.62 m, porque el paciente no tiene peso registrado)." : "."}
                </span>
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-hud-tenue">
                <Zap size={13} className="mt-px flex-shrink-0" />
                <span>Las variables siguen siendo aleatorias: esto desplaza sus sorteos, no los fija.</span>
              </p>
            </div>
          </aside>
        </div>

        {/* Pie */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hud-borde px-5 py-3">
          <p className="text-xs text-rose-400" role="alert">{error}</p>
          <div className="flex gap-2">
            <Boton variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
            <Boton onClick={guardar} cargando={guardando} icono={<Check size={16} />}>
              {escenario ? "Guardar cambios" : "Agregar escenario"}
            </Boton>
          </div>
        </footer>
      </div>
    </div>
  );
}
