import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Boton, Entrada, Muestra } from "./ui";
import { COLOR_SEDENTARISMO, DETALLE_SEDENTARISMO, NOMBRE_SEDENTARISMO, SEDENTARISMO, cambioPredefinido, tasaDesgasteAdiposo } from "../lib/perfil";
import type { DatosEscenario, Escenario, NivelIntervencion, Paciente, Sedentarismo } from "../types";

type NivelPlantilla = Exclude<NivelIntervencion, "personalizada">;

const OPCIONES_PLANTILLA: { nivel: NivelPlantilla; titulo: string; texto: string }[] = [
  { nivel: "nula", titulo: "Sin cambios", texto: "Sigue con sus hábitos" },
  { nivel: "moderada", titulo: "Moderada", texto: "Un nivel más activo y −3.5 % de IMC" },
  { nivel: "intensiva", titulo: "Intensiva", texto: "Activo y −7 % de IMC" },
];

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-hud-borde pt-4">
      <h3 className="mb-3 font-serif text-lg font-semibold text-white">{titulo}</h3>
      {children}
    </section>
  );
}

function FilaEfecto({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hud-borde py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-hud-texto">{etiqueta}</p>
        {nota && <p className="text-xs text-hud-tenue">{nota}</p>}
      </div>
      <span className="cifras whitespace-nowrap text-sm font-medium text-white">{valor}</span>
    </div>
  );
}

const claseOpcion = (activa: boolean) =>
  `rounded-md border px-3 py-2.5 text-left transition-colors ${activa ? "border-hud-acento bg-hud-panel-2 outline outline-1 outline-hud-acento" : "border-hud-borde-fuerte hover:bg-hud-panel-2"}`;

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
  const maxImc = Math.max(40, Math.ceil(paciente.imc));

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onCerrar} />
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal-escenario" className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-md border border-hud-borde-fuerte bg-hud-fondo shadow-xl sm:rounded-md">
        <header className="flex items-start justify-between gap-4 border-b border-hud-borde px-6 py-4">
          <div>
            <p className="text-xs text-hud-tenue">{escenario ? "Editar escenario" : "Nuevo escenario"}</p>
            <h2 id="titulo-modal-escenario" className="mt-0.5 text-2xl text-white">¿Qué cambiaría {paciente.nombre.split(" ")[0]} en su estilo de vida?</h2>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded p-1.5 text-hud-suave hover:bg-hud-panel-2 hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="grid flex-1 gap-8 overflow-y-auto p-6 lg:grid-cols-[1fr_290px]">
          <div className="space-y-6">
            <div>
              <label htmlFor="nombre-escenario" className="mb-1.5 block text-[13px] font-medium text-hud-texto">Nombre del escenario</label>
              <Entrada id="nombre-escenario" ref={refNombre} value={nombre} onChange={(ev) => setNombre(ev.target.value)} placeholder="Ej. Empieza a caminar y baja de peso" maxLength={120} />
            </div>

            <Bloque titulo="Empezar desde una plantilla">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {OPCIONES_PLANTILLA.map(({ nivel, titulo, texto }) => (
                  <button key={nivel} type="button" onClick={() => aplicarPlantilla(nivel)} aria-pressed={e.nivel === nivel} className={claseOpcion(e.nivel === nivel)}>
                    <span className="block text-sm font-medium text-white">{titulo}</span>
                    <span className="block text-xs text-hud-tenue">{texto}</span>
                  </button>
                ))}
              </div>
              {e.nivel === "personalizada" && <p className="mt-2 text-xs text-hud-tenue">Ajustado a mano: se guardará como intervención personalizada.</p>}
            </Bloque>

            <Bloque titulo="Actividad física">
              <div className="grid grid-cols-3 gap-2">
                {SEDENTARISMO.map((nivel) => (
                  <button key={nivel} type="button" onClick={() => personalizar({ sedentarismo: nivel })} aria-pressed={e.sedentarismo === nivel} className={claseOpcion(e.sedentarismo === nivel)}>
                    <span className="flex items-center gap-2 text-sm font-medium text-white"><Muestra color={COLOR_SEDENTARISMO[nivel]} />{NOMBRE_SEDENTARISMO[nivel]}</span>
                    <span className="mt-0.5 block text-xs text-hud-tenue">{DETALLE_SEDENTARISMO[nivel]}</span>
                  </button>
                ))}
              </div>
            </Bloque>

            <Bloque titulo="IMC objetivo">
              <div className="flex items-center gap-4">
                <input type="range" min={18} max={maxImc} step={0.5} value={Math.min(e.imc, maxImc)} onChange={(ev) => personalizar({ imc: +ev.target.value })} className="flex-1" aria-label="IMC objetivo" />
                <span className="cifras w-20 text-right text-sm text-white">IMC {e.imc.toFixed(1)}</span>
              </div>
              <p className="mt-1 text-xs text-hud-tenue">Hoy el paciente tiene IMC {paciente.imc}.</p>
            </Bloque>

            <Bloque titulo="Cuándo empieza">
              <div className="flex items-center gap-4">
                <input type="range" min={0} max={Math.max(0, horizonte - 1)} value={Math.min(e.inicio, Math.max(0, horizonte - 1))} onChange={(ev) => personalizar({ inicio: +ev.target.value })} className="flex-1" aria-label="Año de inicio" />
                <span className="cifras w-20 text-right text-sm text-white">{e.inicio === 0 ? "Hoy" : `Año ${e.inicio}`}</span>
              </div>
            </Bloque>
          </div>

          <aside>
            <div className="sticky top-0 border-t border-hud-borde-fuerte pt-4">
              <h3 className="mb-1 font-serif text-lg font-semibold text-white">Efecto sobre el modelo</h3>
              <FilaEfecto etiqueta="Desgaste adiposo k_VAT" valor={`${kAntes.toFixed(4)} → ${kDespues.toFixed(4)}`} nota={reduccion > 0 ? `${reduccion} % menos desgaste de la sensibilidad` : "sin cambio"} />
              <FilaEfecto etiqueta="IMC del paciente" valor={`${paciente.imc} → ${e.imc.toFixed(1)}`} />
              <FilaEfecto etiqueta="Resiliencia riesgo_vida" valor={`${NOMBRE_SEDENTARISMO[paciente.sedentarismo]} → ${NOMBRE_SEDENTARISMO[e.sedentarismo]}`} nota="rango de la Uniforme según el nivel" />
              <p className="mt-4 text-xs leading-relaxed text-hud-tenue">
                El cambio aplica desde {e.inicio === 0 ? "hoy" : `el año ${e.inicio}`}. La sensibilidad inicial S_I0 no cambia. Las variables siguen siendo aleatorias: el cambio modifica su rango, no las fija.
              </p>
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hud-borde px-6 py-3">
          <p className="text-sm text-rose-400" role="alert">{error}</p>
          <div className="flex gap-2">
            <Boton variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
            <Boton onClick={guardar} cargando={guardando}>{escenario ? "Guardar cambios" : "Agregar escenario"}</Boton>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
