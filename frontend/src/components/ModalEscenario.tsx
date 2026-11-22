import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bike, CalendarRange, Check, Flame, Footprints, Info, Scale, Sofa, X, Zap } from "lucide-react";
import { Boton, Entrada, tinta } from "./ui";
import { COLOR_SEDENTARISMO, DETALLE_SEDENTARISMO, NOMBRE_SEDENTARISMO, SEDENTARISMO, cambioPredefinido, tasaDesgasteAdiposo } from "../lib/perfil";
import type { DatosEscenario, Escenario, NivelIntervencion, Paciente, Sedentarismo } from "../types";

type NivelPlantilla = Exclude<NivelIntervencion, "personalizada">;

const OPCIONES_PLANTILLA: { nivel: NivelPlantilla; titulo: string; texto: string; icono: typeof Sofa; color: string }[] = [
  { nivel: "nula", titulo: "Sin cambios", texto: "Sigue con sus hábitos", icono: Sofa, color: "#f43f5e" },
  { nivel: "moderada", titulo: "Moderada", texto: "Un nivel más activo · −3.5 % IMC", icono: Footprints, color: "#facc15" },
  { nivel: "intensiva", titulo: "Intensiva", texto: "Activo · −7 % IMC", icono: Flame, color: "#3fb98a" },
];

const ICONO_NIVEL: Record<Sedentarismo, typeof Sofa> = { activo: Flame, moderado: Bike, severo: Sofa };

function Tarjeta({ icono, titulo, color, children }: { icono: ReactNode; titulo: string; color: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-hud-borde bg-hud-fondo/40 p-4">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border" style={{ color: tinta(color), borderColor: `${color}55`, backgroundColor: `${color}18` }}>
          {icono}
        </span>
        <h3 className="font-semibold text-white">{titulo}</h3>
      </header>
      {children}
    </section>
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

interface Props {
  abierto: boolean;
  escenario: Escenario | null;
  paciente: Paciente;
  horizonte: number;
  onCerrar: () => void;
  onGuardar: (datos: DatosEscenario) => Promise<void>;
}

interface Estado {
  nivel: NivelIntervencion;
  sedentarismo: Sedentarismo;
  imc: number;
  inicio: number;
}

function estadoInicial(escenario: Escenario | null, paciente: Paciente): Estado {
  if (!escenario) return { nivel: "moderada", ...cambioPredefinido("moderada", paciente.sedentarismo, paciente.imc), inicio: 0 };
  if (escenario.nivel_intervencion === "personalizada" && escenario.parametros) {
    const p = escenario.parametros;
    return { nivel: "personalizada", sedentarismo: p.sedentarismo, imc: p.imc_objetivo ?? paciente.imc, inicio: p.inicio_anio };
  }
  const nivel = escenario.nivel_intervencion === "personalizada" ? "moderada" : escenario.nivel_intervencion;
  return { nivel: escenario.nivel_intervencion, ...cambioPredefinido(nivel, paciente.sedentarismo, paciente.imc), inicio: 0 };
}

export function ModalEscenario({ abierto, escenario, paciente, horizonte, onCerrar, onGuardar }: Props) {
  const [nombre, setNombre] = useState("");
  const [e, setE] = useState<Estado>({ nivel: "moderada", sedentarismo: "moderado", imc: 25, inicio: 0 });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refNombre = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setNombre(escenario?.nombre ?? "");
    setE(estadoInicial(escenario, paciente));
    setError(null);
    setTimeout(() => refNombre.current?.focus(), 30);
  }, [abierto, escenario, paciente]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (ev: KeyboardEvent) => ev.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const kAntes = tasaDesgasteAdiposo(paciente.sedentarismo, paciente.imc);
  const kDespues = tasaDesgasteAdiposo(e.sedentarismo, e.imc);
  const reduccion = kAntes > 0 ? Math.round((1 - kDespues / kAntes) * 100) : 0;

  function aplicarPlantilla(nivel: NivelPlantilla) {
    setE({ nivel, ...cambioPredefinido(nivel, paciente.sedentarismo, paciente.imc), inicio: e.inicio });
    if (!nombre.trim() || OPCIONES_PLANTILLA.some((o) => o.titulo === nombre || `Intervención ${o.titulo.toLowerCase()}` === nombre)) {
      setNombre(nivel === "nula" ? "Sin cambios" : `Intervención ${nivel}`);
    }
  }

  const personalizar = (parcial: Partial<Estado>) => setE((prev) => ({ ...prev, ...parcial, nivel: "personalizada" }));

  async function guardar() {
    if (!nombre.trim()) {
      setError("Ponle un nombre al escenario.");
      refNombre.current?.focus();
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const parametros = e.nivel === "personalizada" ? { sedentarismo: e.sedentarismo, imc_objetivo: e.imc, inicio_anio: e.inicio } : null;
      await onGuardar({ nombre: nombre.trim(), nivel_intervencion: e.nivel, parametros });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el escenario");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm" onClick={onCerrar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-escenario"
        className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-hud-borde-fuerte bg-hud-panel shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-hud-borde px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">{escenario ? "Editar escenario" : "Nuevo escenario"}</p>
            <h2 id="titulo-modal-escenario" className="mt-0.5 text-lg font-bold text-white">¿Qué cambiaría {paciente.nombre.split(" ")[0]} en su estilo de vida?</h2>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-hud-suave hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre-escenario" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-hud-suave">Nombre del escenario</label>
              <Entrada id="nombre-escenario" ref={refNombre} value={nombre} onChange={(ev) => setNombre(ev.target.value)} placeholder="Ej. Empieza a caminar y baja de peso" maxLength={120} />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-hud-suave">Empezar desde una plantilla</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {OPCIONES_PLANTILLA.map(({ nivel, titulo, texto, icono: Icono, color }) => {
                  const sel = e.nivel === nivel;
                  return (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => aplicarPlantilla(nivel)}
                      aria-pressed={sel}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${sel ? "border-hud-acento bg-hud-acento/10" : "border-hud-borde hover:border-hud-borde-fuerte"}`}
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ color: tinta(color), backgroundColor: `${color}1f` }}>
                        <Icono size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white">{titulo}</span>
                        <span className="block text-[11px] text-hud-tenue">{texto}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {e.nivel === "personalizada" && <p className="mt-2 text-xs text-hud-tenue">Ajustado a mano: se guardará como intervención personalizada.</p>}
            </div>

            <Tarjeta icono={<Footprints size={16} />} titulo="Actividad física" color="#3fb98a">
              <div className="grid grid-cols-3 gap-2">
                {SEDENTARISMO.map((nivel) => {
                  const Icono = ICONO_NIVEL[nivel];
                  const activa = e.sedentarismo === nivel;
                  return (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => personalizar({ sedentarismo: nivel })}
                      aria-pressed={activa}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                        activa ? "border-hud-acento bg-hud-acento/12 text-white" : "border-hud-borde text-hud-suave hover:border-hud-borde-fuerte hover:text-white"
                      }`}
                    >
                      <span style={{ color: activa ? COLOR_SEDENTARISMO[nivel] : undefined }}><Icono size={18} /></span>
                      <span className="text-xs font-semibold">{NOMBRE_SEDENTARISMO[nivel]}</span>
                      <span className="text-[10px] leading-tight text-hud-tenue">{DETALLE_SEDENTARISMO[nivel]}</span>
                    </button>
                  );
                })}
              </div>
            </Tarjeta>

            <Tarjeta icono={<Scale size={16} />} titulo="IMC objetivo" color="#7c8fd6">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={18}
                  max={Math.max(40, Math.ceil(paciente.imc))}
                  step={0.5}
                  value={Math.min(e.imc, Math.max(40, Math.ceil(paciente.imc)))}
                  onChange={(ev) => personalizar({ imc: +ev.target.value })}
                  className="flex-1"
                  aria-label="IMC objetivo"
                />
                <span className="w-24 text-right font-mono text-sm text-white">IMC {e.imc.toFixed(1)}</span>
              </div>
              <p className="mt-1 text-[11px] text-hud-tenue">Hoy el paciente tiene IMC {paciente.imc}.</p>
            </Tarjeta>

            <Tarjeta icono={<CalendarRange size={16} />} titulo="Cuándo empieza" color="#34b4c4">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, horizonte - 1)}
                  value={Math.min(e.inicio, Math.max(0, horizonte - 1))}
                  onChange={(ev) => personalizar({ inicio: +ev.target.value })}
                  className="flex-1"
                  aria-label="Año de inicio"
                />
                <span className="w-24 text-right font-mono text-sm text-white">{e.inicio === 0 ? "Hoy" : `Año ${e.inicio}`}</span>
              </div>
            </Tarjeta>
          </div>

          <aside>
            <div className="sticky top-0 rounded-xl border border-hud-borde-fuerte bg-hud-fondo/50 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Efecto sobre el modelo</p>
              <FilaEfecto simbolo="k_VAT" texto="desgaste adiposo" valor={`${kAntes.toFixed(4)} → ${kDespues.toFixed(4)}`} nota={reduccion > 0 ? `${reduccion} % menos desgaste de la sensibilidad` : "sin cambio"} />
              <FilaEfecto simbolo="IMC" texto="del paciente" valor={`${paciente.imc} → ${e.imc.toFixed(1)}`} />
              <FilaEfecto simbolo="riesgo_vida" texto="resiliencia" valor={`${NOMBRE_SEDENTARISMO[paciente.sedentarismo]} → ${NOMBRE_SEDENTARISMO[e.sedentarismo]}`} nota="rango de la Uniforme según el nivel" />
              <p className="mt-4 flex items-start gap-1.5 text-[11px] text-hud-tenue">
                <Info size={13} className="mt-px flex-shrink-0" />
                <span>El cambio aplica desde {e.inicio === 0 ? "hoy" : `el año ${e.inicio}`}. La sensibilidad inicial S_I0 no cambia: ya es la del paciente.</span>
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-hud-tenue">
                <Zap size={13} className="mt-px flex-shrink-0" />
                <span>Las variables siguen siendo aleatorias: el cambio modifica su rango, no las fija.</span>
              </p>
            </div>
          </aside>
        </div>

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
