import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, Calculator, FlaskConical, RefreshCw, TriangleAlert } from "lucide-react";
import { PublicLayout } from "../components/PublicLayout";
import { COLOR_ETAPA, StageBadge } from "../components/StageBadge";
import { BotonEnlace, Campo, Entrada, Unidad, tinta } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import type { Etapa } from "../types";

/* =====================================================================
   Esta página explica, paso a paso, lo que hace backend/app/engine.py.
   Las constantes de abajo son copia de las del motor: si se recalibra
   el motor, hay que actualizarlas aquí también.
   ===================================================================== */
const K = {
  G_BASAL: 85,
  K5: 1.5,
  D_INS_BASAL: 6,
  I_SEC_MAX: 60,
  K_CAL: 7700,
  G_ACT_MAX: 3500,
  K2: 0.00015,
  K6: 0.005,
  K6B: 0.0015,
  K7: 0.06,
  T_BETA_BASAL: 0.0005,
  ALPHA_GEN: 1.4,
  THETA_UMB: 0.5,
  P_GEN: 0.35,
};
const PISO_C_BETA: Record<Etapa, number> = { sano: 70, resistencia: 55, prediabetes: 35, diabetes: 0 };

const clip = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function etapaClinica(glucosa: number, hba1c: number | null, homa: number): Etapa {
  if (glucosa >= 126 || (hba1c !== null && hba1c >= 6.5)) return "diabetes";
  if (glucosa >= 100 || (hba1c !== null && hba1c >= 5.7)) return "prediabetes";
  if (homa >= 2.5) return "resistencia";
  return "sano";
}

/* ---------------- piezas de presentación ---------------- */

const SECCIONES = [
  { id: "resumen", titulo: "Visión general" },
  { id: "entradas", titulo: "1. Datos del paciente" },
  { id: "estado-inicial", titulo: "2. Estado inicial" },
  { id: "aleatorias", titulo: "3. Variables aleatorias" },
  { id: "intervencion", titulo: "4. Escenarios" },
  { id: "paso-semanal", titulo: "5. El paso semanal" },
  { id: "etapas", titulo: "6. Clasificación" },
  { id: "monte-carlo", titulo: "7. De trayectorias a pronóstico" },
  { id: "parametros", titulo: "8. Parámetros" },
  { id: "limitaciones", titulo: "9. Alcances y límites" },
];

/** Variable con subíndice: <V s="I">S</V> → S_I */
function V({ children, s }: { children: ReactNode; s?: ReactNode }) {
  return (
    <span className="whitespace-nowrap italic">
      {children}
      {s !== undefined && <sub className="not-italic text-[0.72em]">{s}</sub>}
    </span>
  );
}

function Formula({ children, etiqueta }: { children: ReactNode; etiqueta?: string }) {
  return (
    <div className="my-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 overflow-x-auto rounded-lg border border-hud-borde bg-hud-fondo/60 px-4 py-3">
      <div className="font-serif text-[15px] text-white">{children}</div>
      {etiqueta && <span className="font-mono text-[11px] uppercase tracking-wider text-hud-tenue">{etiqueta}</span>}
    </div>
  );
}

function Seccion({ id, eyebrow, titulo, children }: { id: string; eyebrow: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-hud-borde pt-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-bold text-white">{titulo}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-hud-suave">{children}</div>
    </section>
  );
}

function Tabla({ cabecera, filas }: { cabecera: string[]; filas: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-hud-borde">
      <table className="w-full text-sm">
        <thead className="bg-hud-panel-2/60 text-left text-[11px] uppercase tracking-wider text-hud-tenue">
          <tr>{cabecera.map((c) => <th key={c} className="px-4 py-2.5 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-hud-borde">
              {f.map((c, j) => <td key={j} className={`px-4 py-2.5 align-top ${j === 0 ? "text-white" : "text-hud-texto"}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mini gráfico de la forma de cada distribución. */
function FormaDistribucion({ tipo }: { tipo: "normal" | "uniforme" | "gamma" | "bernoulli" }) {
  const trazo = "stroke-hud-acento";
  return (
    <svg viewBox="0 0 80 36" className="h-9 w-20" aria-hidden="true">
      <line x1="2" y1="33" x2="78" y2="33" className="stroke-hud-borde-fuerte" strokeWidth="1" />
      {tipo === "normal" && <path d="M4 33 C 22 33, 28 4, 40 4 S 58 33, 76 33" fill="none" className={trazo} strokeWidth="2" />}
      {tipo === "uniforme" && <path d="M14 33 V 12 H 66 V 33" fill="none" className={trazo} strokeWidth="2" />}
      {tipo === "gamma" && <path d="M4 33 C 10 33, 14 5, 22 5 S 40 26, 76 31" fill="none" className={trazo} strokeWidth="2" />}
      {tipo === "bernoulli" && (
        <>
          <rect x="18" y="12" width="12" height="21" className="fill-hud-acento/60" />
          <rect x="50" y="22" width="12" height="11" className="fill-hud-acento/60" />
          <text x="24" y="9" textAnchor="middle" className="fill-hud-tenue text-[7px]">0</text>
          <text x="56" y="19" textAnchor="middle" className="fill-hud-tenue text-[7px]">1</text>
        </>
      )}
    </svg>
  );
}

/* ---------------- calculadora del estado inicial ---------------- */

function Resultado({ etiqueta, valor, nota }: { etiqueta: ReactNode; valor: ReactNode; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hud-borde py-2 first:border-t-0">
      <span className="text-sm text-hud-suave">{etiqueta}</span>
      <span className="text-right">
        <span className="font-mono font-semibold text-white">{valor}</span>
        {nota && <span className="block text-[11px] text-hud-tenue">{nota}</span>}
      </span>
    </div>
  );
}

function CalculadoraEstadoInicial() {
  // Valores ilustrativos de un caso típico de prediabetes (no son datos de ningún paciente).
  const [glucosa, setGlucosa] = useState("108");
  const [insulina, setInsulina] = useState("15");
  const [imc, setImc] = useState("31");
  const [hba1c, setHba1c] = useState("5.9");

  const r = useMemo(() => {
    const g = parseFloat(glucosa), i = parseFloat(insulina), b = parseFloat(imc);
    const a = hba1c.trim() === "" ? null : parseFloat(hba1c);
    if (!(g > 0) || !(i > 0) || !(b > 0)) return null;
    const iSec0 = Math.max(i, 0.5);
    const deficit = Math.max(0, (g - K.G_BASAL) / K.K5);
    const dIns0 = clip(iSec0 + deficit, 2, 60);
    const sI0 = clip(K.D_INS_BASAL / dIns0, 0.05, 1.5);
    const cBetaBruta = deficit < 1 ? 100 : clip((100 * iSec0) / K.I_SEC_MAX, 5, 100);
    const homa = (g * i) / 405;
    const etapa = etapaClinica(g, a !== null && !Number.isNaN(a) ? a : null, homa);
    const cBeta0 = Math.max(cBetaBruta, PISO_C_BETA[etapa]);
    const mAdip0 = clip((b - 22) * 2.5, 0, 80);
    const gAct = clip(1200 - (b - 22) * 40, 100, 1200);
    return { iSec0, deficit, dIns0, sI0, cBetaBruta, cBeta0, homa, etapa, mAdip0, gAct, eCal: gAct / 7 };
  }, [glucosa, insulina, imc, hba1c]);

  return (
    <div className="rounded-2xl border border-hud-borde-fuerte bg-hud-panel/80 p-5 shadow-[var(--sombra-panel)]">
      <div className="flex items-center gap-2">
        <Calculator size={17} className="text-hud-acento" />
        <p className="font-semibold text-white">Pruébalo: calcula el estado inicial</p>
      </div>
      <p className="mt-1 text-sm text-hud-tenue">Valores ilustrativos de un caso típico de prediabetes. Cámbialos y mira cómo se recalcula todo.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Campo etiqueta={<>Glucosa <Unidad>mg/dL</Unidad></>} htmlFor="c-glu"><Entrada id="c-glu" type="number" value={glucosa} onChange={(e) => setGlucosa(e.target.value)} /></Campo>
        <Campo etiqueta={<>Insulina <Unidad>µU/mL</Unidad></>} htmlFor="c-ins"><Entrada id="c-ins" type="number" step="0.1" value={insulina} onChange={(e) => setInsulina(e.target.value)} /></Campo>
        <Campo etiqueta="IMC" htmlFor="c-imc"><Entrada id="c-imc" type="number" step="0.1" value={imc} onChange={(e) => setImc(e.target.value)} /></Campo>
        <Campo etiqueta="HbA1c %" htmlFor="c-a1c"><Entrada id="c-a1c" type="number" step="0.1" value={hba1c} onChange={(e) => setHba1c(e.target.value)} placeholder="opcional" /></Campo>
      </div>

      {r ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-hud-borde bg-hud-fondo/40 px-4 py-2">
            <Resultado etiqueta={<>HOMA-IR = G·I / 405</>} valor={r.homa.toFixed(2)} />
            <Resultado etiqueta="Etapa clínica de hoy" valor={<StageBadge etapa={r.etapa} />} />
            <Resultado etiqueta={<>Déficit = max(0, (G − 85) / 1.5)</>} valor={r.deficit.toFixed(2)} nota="µU/mL de insulina que “faltan”" />
            <Resultado etiqueta={<><V s="ins">D</V>(0) = <V s="sec">I</V>(0) + déficit</>} valor={r.dIns0.toFixed(2)} nota="demanda de insulina" />
          </div>
          <div className="rounded-xl border border-hud-borde bg-hud-fondo/40 px-4 py-2">
            <Resultado etiqueta={<><V s="I">S</V>(0) = 6 / <V s="ins">D</V>(0)</>} valor={r.sI0.toFixed(3)} nota={`${Math.round(r.sI0 * 100)}% de sensibilidad normal`} />
            <Resultado
              etiqueta={<><V s="β">C</V>(0) reserva pancreática</>}
              valor={`${r.cBeta0.toFixed(0)}%`}
              nota={r.cBeta0 > r.cBetaBruta ? `bruto ${r.cBetaBruta.toFixed(0)}% → piso de la etapa ${PISO_C_BETA[r.etapa]}%` : r.deficit < 1 ? "sin déficit → reserva sana" : "100·I_sec / 60"}
            />
            <Resultado etiqueta={<><V s="adip">M</V>(0) = (IMC − 22)·2.5</>} valor={`${r.mAdip0.toFixed(1)} kg`} nota="grasa acumulada sobre lo saludable" />
            <Resultado etiqueta={<>Línea base <V s="act">G</V> / <V s="cal">E</V></>} valor={`${r.gAct.toFixed(0)} / ${r.eCal.toFixed(0)}`} nota="kcal/semana · kcal/día" />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-hud-tenue">Completa glucosa, insulina e IMC con valores positivos.</p>
      )}
    </div>
  );
}

/* ---------------- diagrama del paso semanal ---------------- */

function Nodo({ titulo, sub, regla, color = "#22d3ee" }: { titulo: string; sub: string; regla?: string; color?: string }) {
  return (
    <div className="relative min-w-0 flex-1 rounded-xl border bg-hud-panel/90 px-3 py-2.5 text-center" style={{ borderColor: `${color}66` }}>
      {regla && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border bg-hud-fondo px-1.5 font-mono text-[10px] font-bold" style={{ borderColor: `${color}88`, color: tinta(color) }}>
          {regla}
        </span>
      )}
      <p className="text-sm font-semibold text-white">{titulo}</p>
      <p className="text-[11px] text-hud-tenue">{sub}</p>
    </div>
  );
}

function Flecha() {
  return (
    <div className="flex items-center justify-center text-hud-tenue">
      <ArrowRight size={16} className="hidden md:block" />
      <ArrowDown size={16} className="md:hidden" />
    </div>
  );
}

function DiagramaCausal() {
  return (
    <div className="rounded-2xl border border-hud-borde bg-hud-panel/60 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <Nodo titulo="Balance energético" sub="7·E_cal − G_act" />
        <Flecha />
        <Nodo titulo="Grasa M_adip" sub="se acumula" regla="R1" color="#facc15" />
        <Flecha />
        <Nodo titulo="Sensibilidad S_I" sub="baja" regla="R2" color="#fb923c" />
        <Flecha />
        <Nodo titulo="Reserva C_β" sub="se agota" regla="R4" color="#f472b6" />
        <Flecha />
        <Nodo titulo="Glucosa" sub="sube" regla="R3" color="#f43f5e" />
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-rose-400/50 px-3 py-2 text-sm text-hud-suave">
        <RefreshCw size={15} className="mt-0.5 flex-shrink-0 text-rose-400" />
        <span>
          <b className="text-white">R6 · Retroalimentación:</b> si la glucosa supera 100 mg/dL, acelera el agotamiento de las células β y
          reduce aún más la sensibilidad — por eso la progresión se acelera una vez que empieza.
          <b className="text-white"> R7</b> (intervención) actúa en sentido contrario, devolviendo sensibilidad.
        </span>
      </div>
    </div>
  );
}

/** Ilustración estática de cómo se leen las bandas del gráfico de trayectorias. */
function IlustracionBandas() {
  return (
    <svg viewBox="0 0 320 140" className="w-full max-w-md" role="img" aria-label="Ilustración: banda del percentil 10 al 90 alrededor de la mediana">
      <line x1="20" y1="120" x2="310" y2="120" className="stroke-hud-borde-fuerte" />
      <line x1="20" y1="10" x2="20" y2="120" className="stroke-hud-borde-fuerte" />
      <path d="M20 95 C 90 92, 150 70, 200 45 S 280 18, 310 14 L 310 60 C 270 70, 230 85, 190 95 S 90 104, 20 98 Z" className="fill-hud-acento/20" />
      <path d="M20 96 C 100 96, 160 85, 210 68 S 285 42, 310 36" fill="none" className="stroke-hud-acento" strokeWidth="2.5" />
      <text x="232" y="22" className="fill-hud-suave text-[10px]">percentil 90</text>
      <text x="236" y="88" className="fill-hud-suave text-[10px]">percentil 10</text>
      <text x="120" y="80" className="fill-white text-[10px] font-semibold">mediana (p50)</text>
      <text x="290" y="134" className="fill-hud-tenue text-[9px]">años</text>
    </svg>
  );
}

/* ---------------- página ---------------- */

export default function ComoFunciona() {
  const { usuario } = useAuth();

  return (
    <PublicLayout>
      {/* Encabezado */}
      <section className="border-b border-hud-borde bg-hud-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">Metodología</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">Cómo funciona la simulación</h1>
          <p className="mt-4 max-w-3xl text-lg text-hud-suave">
            El pronóstico sale de un modelo de <b className="text-white">dinámica de sistemas en tiempo discreto</b> (Δt = 1 semana)
            combinado con <b className="text-white">simulación Monte Carlo</b>: se generan cientos de futuros posibles del mismo
            paciente y se resumen en probabilidades. Aquí está el procedimiento completo, con las fórmulas que usa el motor.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
        {/* Índice */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-0.5 border-l border-hud-borde" aria-label="Contenido">
            {SECCIONES.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-hud-suave transition-colors hover:border-hud-acento hover:text-white">
                {s.titulo}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 space-y-12 pb-10">
          {/* Visión general */}
          <section id="resumen" className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-white">Visión general</h2>
            <p className="mt-3 text-hud-suave">Cada vez que presionas “Ejecutar simulación” ocurre lo siguiente, para cada escenario:</p>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Datos del paciente", "Labs de hoy, IMC, antecedentes"],
                ["Estado inicial", "S_I, C_β y M_adip estimados"],
                ["Bucle semanal", "52 × años · reglas R1–R7"],
                ["Clasificación", "Etapa de cada trayectoria"],
                ["Resumen", "Percentiles y probabilidades"],
              ].map(([t, d], i) => (
                <li key={t} className="relative rounded-xl border border-hud-borde bg-hud-panel/80 p-4 shadow-[var(--sombra-panel)]">
                  <span className="font-mono text-xs text-hud-acento">0{i + 1}</span>
                  <p className="mt-1 font-semibold text-white">{t}</p>
                  <p className="text-xs text-hud-tenue">{d}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-hud-tenue">
              Cada una de las M trayectorias (100, 200 o 500) parte del <i>mismo</i> estado inicial; lo único que las diferencia es el camino
              aleatorio que toman: cuánto come y se mueve el paciente cada semana, la velocidad de agotamiento de su páncreas y, si no se
              conoce, su predisposición genética.
            </p>
          </section>

          {/* 1. Entradas */}
          <Seccion id="entradas" eyebrow="Paso 1" titulo="Datos del paciente">
            <p>El modelo solo necesita lo que se mide en una consulta habitual:</p>
            <Tabla
              cabecera={["Dato", "Para qué se usa"]}
              filas={[
                ["Glucosa en ayunas (mg/dL)", "Etapa clínica de hoy y déficit de insulina → sensibilidad y reserva iniciales."],
                ["Insulina en ayunas (µU/mL)", "Es la secreción observada I_sec(0); junto con la glucosa da el HOMA-IR."],
                ["HbA1c (%) · opcional", "Solo para la etapa clínica de hoy (prediabetes ≥ 5.7, diabetes ≥ 6.5)."],
                ["IMC", "Grasa acumulada inicial M_adip(0) y nivel de actividad de referencia."],
                ["Antecedente familiar de DMT2", "Fija P_gen en 1 o 0; si no se sabe, se sortea con probabilidad 0.35."],
                ["Edad", "Para expresar el punto de inflexión como edad del paciente."],
              ]}
            />
          </Seccion>

          {/* 2. Estado inicial */}
          <Seccion id="estado-inicial" eyebrow="Paso 2" titulo="Estimar el estado inicial (oculto)">
            <p>
              El modelo trabaja con tres variables que no se miden directamente — la <b className="text-white">sensibilidad a la insulina</b>{" "}
              <V s="I">S</V>, la <b className="text-white">reserva de células β</b> <V s="β">C</V> y la <b className="text-white">grasa acumulada</b>{" "}
              <V s="adip">M</V>. Se infieren de los labs de hoy de forma que, al recalcularlas con las fórmulas del modelo, se reproduzcan la glucosa y
              la insulina medidas:
            </p>
            <Formula etiqueta="secreción observada"><V s="sec">I</V>(0) = insulina medida</Formula>
            <Formula etiqueta="déficit">déficit = max(0, (G − 85) / <V s="5">k</V>) , <V s="5">k</V> = 1.5</Formula>
            <Formula etiqueta="demanda"><V s="ins">D</V>(0) = <V s="sec">I</V>(0) + déficit</Formula>
            <Formula etiqueta="sensibilidad"><V s="I">S</V>(0) = <V s="ins,basal">D</V> / <V s="ins">D</V>(0) , <V s="ins,basal">D</V> = 6</Formula>
            <Formula etiqueta="reserva β"><V s="β">C</V>(0) = 100 · <V s="sec">I</V>(0) / <V s="sec,max">I</V> si hay déficit; 100 % si no</Formula>
            <Formula etiqueta="grasa"><V s="adip">M</V>(0) = (IMC − 22) · 2.5 kg</Formula>
            <p className="text-sm">
              La lógica: si hay glucosa de más es porque el páncreas ya está secretando todo lo que puede, así que la reserva se lee directamente de
              la insulina medida. Como esa inversión puede dar reservas irrealmente bajas, se aplica un <b className="text-white">piso por etapa</b>:{" "}
              sano 70 %, resistencia 55 %, prediabetes 35 %.
            </p>
            <CalculadoraEstadoInicial />
          </Seccion>

          {/* 3. Variables aleatorias */}
          <Seccion id="aleatorias" eyebrow="Paso 3" titulo="Las variables aleatorias">
            <p>
              Son la fuente de incertidumbre del modelo. Se sortean de nuevo cada semana (excepto <V s="gen">P</V>, una vez por trayectoria):
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { tipo: "normal" as const, simbolo: <V s="cal">E</V>, nombre: "Ingesta calórica diaria", dist: "Normal(μ = E_base, σ = 100)", nota: "E_base = G_base / 7 kcal/día" },
                { tipo: "uniforme" as const, simbolo: <V s="act">G</V>, nombre: "Gasto por actividad física semanal", dist: "Uniforme[G_base − 300, G_base + 300]", nota: "G_base = 1200 − 40·(IMC − 22) kcal/semana" },
                { tipo: "gamma" as const, simbolo: <V s="β">T</V>, nombre: "Tasa de agotamiento de células β", dist: "Gamma(forma = 2, escala = 0.0015)", nota: "media ≈ 0.003 por semana" },
                { tipo: "bernoulli" as const, simbolo: <V s="gen">P</V>, nombre: "Predisposición genética", dist: "Bernoulli(p = 0.35)", nota: "o fijo 0/1 si se conoce el antecedente" },
              ].map((v) => (
                <div key={v.nombre} className="flex gap-4 rounded-xl border border-hud-borde bg-hud-panel/80 p-4 shadow-[var(--sombra-panel)]">
                  <FormaDistribucion tipo={v.tipo} />
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-white">{v.simbolo}</p>
                    <p className="text-sm font-medium text-hud-texto">{v.nombre}</p>
                    <p className="mt-1 font-mono text-xs text-cyan-200">{v.dist}</p>
                    <p className="text-xs text-hud-tenue">{v.nota}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm">
              La línea base está construida para que, en el escenario “sin cambios”, el balance energético sea en promedio cero (7·E_base = G_base): mantener los
              hábitos no implica subir de peso por construcción. A mayor IMC, menor actividad de referencia (proxy de sedentarismo). Además, la sensibilidad
              inicial de cada trayectoria recibe un pequeño ruido <V s="I">S</V>(0) + Normal(0, 0.05).
            </p>
          </Seccion>

          {/* 4. Intervención */}
          <Seccion id="intervencion" eyebrow="Paso 4" titulo="Escenarios de intervención">
            <p>
              Un escenario es un “¿y si…?” sobre los hábitos del paciente. Se arma en un panel con tres bloques y <b className="text-white">no agrega variables
              aleatorias</b>: solo desplaza los sorteos de <V s="cal">E</V> y <V s="act">G</V> y regula la recuperación R7.
            </p>
            <Tabla
              cabecera={["Bloque", "Qué elige el usuario", "Cómo entra al modelo"]}
              filas={[
                ["Alimentación", "Reducción en kcal/día (ej. sin gaseosas −150, porciones −300, plan hipocalórico −500)", "Se resta a cada sorteo de E_cal"],
                ["Actividad física", "Tipo (caminar 3.5 MET, bicicleta 6, correr 8.5), días por semana y minutos por sesión", "kcal/semana = días·min·MET·3.5·peso/200, se suman a G_act"],
                ["Calendario", "Año de inicio y duración (o hasta el final)", "Fuera de esa ventana vuelve a sus hábitos basales"],
              ]}
            />
            <Formula etiqueta="dosis de R7">
              dosis = ½ · min(1, kcal/día ÷ 500) + ½ · min(1, MET·min/semana ÷ 600) ; k<sub>7,efectivo</sub> = 0.06 · dosis
            </Formula>
            <p className="text-sm">
              500 kcal/día es el déficit de referencia de la práctica clínica (≈ 0.5 kg por semana) y 600 MET·min/semana el umbral de actividad de la OMS.
              Las plantillas <i>Moderada</i> (−300 kcal/día, caminar 5×30 min) e <i>Intensiva</i> (−500 kcal/día, bicicleta 5×45 min) solo rellenan el panel.
              La intervención deja de aplicarse en una trayectoria una vez que esta llega a diabetes, y con intervención activa la grasa sí puede disminuir.
              Los escenarios creados antes de este panel conservan la tabla fija original (−15 % / +500 kcal y −30 % / +1200 kcal del excedente).
            </p>
          </Seccion>

          {/* 5. Paso semanal */}
          <Seccion id="paso-semanal" eyebrow="Paso 5" titulo="El paso semanal: reglas R1–R7">
            <p>
              Para t = 1 … 52 × años, y para las M trayectorias a la vez, el motor aplica en este orden:
            </p>
            <DiagramaCausal />

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white">a) Sorteo y balance energético</h3>
                <Formula etiqueta="kcal/semana"><V s="neto">B</V> = 7 · <V s="cal">E</V> − <V s="act">G</V></Formula>
              </div>
              <div>
                <h3 className="font-semibold text-white">b) R3 · Observables: insulina y glucosa</h3>
                <Formula etiqueta="demanda"><V s="ins">D</V> = 6 / <V s="I">S</V></Formula>
                <Formula etiqueta="secreción"><V s="sec">I</V> = min( <V s="ins">D</V> , (<V s="β">C</V> / 100) · 60 )</Formula>
                <Formula etiqueta="glucosa"><V s="ayunas">G</V> = 85 + 1.5 · max(0, <V s="ins">D</V> − <V s="sec">I</V>)</Formula>
                <Formula etiqueta="HOMA del modelo"><V s="HOMA">R</V> = 1 / <V s="I">S</V></Formula>
                <p className="text-sm">Mientras el páncreas puede cubrir la demanda, la glucosa se mantiene en 85; cuando la secreción no alcanza, cada µU/mL que falta sube la glucosa 1.5 mg/dL.</p>
              </div>
              <div>
                <h3 className="font-semibold text-white">c) R6 · Glucotoxicidad (si G &gt; 100)</h3>
                <Formula><V s="β">T</V> ← <V s="β">T</V> · (1 + 0.005 · (G − 100)) ; <V s="I">S</V> ← <V s="I">S</V> · (1 − 0.0015)</Formula>
              </div>
              <div>
                <h3 className="font-semibold text-white">d) R4 · Agotamiento de células β</h3>
                <Formula etiqueta={`si S_I < θ = ${K.THETA_UMB}`}><V s="β">C</V> ← <V s="β">C</V> − 100 · <V s="β">T</V> · (1 + (α − 1) · <V s="gen">P</V>) , α = 1.4</Formula>
                <Formula etiqueta="si no"><V s="β">C</V> ← <V s="β">C</V> − 100 · 0.0005</Formula>
                <p className="text-sm">Con sensibilidad baja el páncreas está sobrecargado y se desgasta mucho más rápido; con antecedente familiar, un 40 % más.</p>
              </div>
              <div>
                <h3 className="font-semibold text-white">e) R2 · Resistencia periférica inducida por grasa</h3>
                <Formula><V s="I">S</V> ← <V s="I">S</V> − 0.00015 · <V s="adip">M</V> · (1 − <V s="act">G</V> / 3500) · (1 + (α − 1) · <V s="gen">P</V>)</Formula>
                <p className="text-sm">Más grasa → más resistencia; más actividad física → menos efecto.</p>
              </div>
              <div>
                <h3 className="font-semibold text-white">f) R7 · Recuperación por intervención</h3>
                <Formula etiqueta="solo con intervención"><V s="I">S</V> ← <V s="I">S</V> + 0.06 · dosis · (1 − <V s="I">S</V>)</Formula>
              </div>
              <div>
                <h3 className="font-semibold text-white">g) R1 · Lipogénesis</h3>
                <Formula etiqueta="7700 kcal = 1 kg"><V s="adip">M</V> ← <V s="adip">M</V> + max(0, <V s="neto">B</V>) / 7700 <span className="text-hud-tenue">(con intervención: + <V s="neto">B</V> / 7700)</span></Formula>
              </div>
              <div>
                <h3 className="font-semibold text-white">h) R5 · Punto de inflexión</h3>
                <p className="text-sm">
                  Se clasifica la etapa de cada trayectoria (sección 6). La primera semana en que una trayectoria entra en diabetes se registra su{" "}
                  <b className="text-white">edad de inflexión</b> = edad + t / 52.
                </p>
              </div>
            </div>
          </Seccion>

          {/* 6. Etapas */}
          <Seccion id="etapas" eyebrow="Paso 6" titulo="Clasificación de etapas">
            <p>
              La semana 0 usa los criterios clínicos estándar sobre los labs reales. Desde la semana 1, el modelo clasifica con sus propias variables:
            </p>
            <Tabla
              cabecera={["Etapa", "Hoy (labs reales)", "Proyección (modelo)"]}
              filas={(
                [
                  ["sano", "ninguno de los siguientes", "ninguno de los siguientes"],
                  ["resistencia", "HOMA-IR ≥ 2.5", "1 / S_I ≥ 2.5"],
                  ["prediabetes", "Glucosa ≥ 100 o HbA1c ≥ 5.7", "G ≥ 100"],
                  ["diabetes", "Glucosa ≥ 126 o HbA1c ≥ 6.5", "G ≥ 126 o C_β ≤ 30 %"],
                ] as [Etapa, string, string][]
              ).map(([e, hoy, modelo]) => [
                <span key={e} className="font-semibold" style={{ color: tinta(COLOR_ETAPA[e]) }}>{{ sano: "Sano", resistencia: "Resistencia", prediabetes: "Prediabetes", diabetes: "Diabetes tipo 2" }[e]}</span>,
                hoy,
                <span key="m" className="font-mono text-xs">{modelo}</span>,
              ])}
            />
            <p className="text-sm">Se evalúa de arriba hacia abajo: la condición más grave que se cumpla define la etapa.</p>
          </Seccion>

          {/* 7. Monte Carlo */}
          <Seccion id="monte-carlo" eyebrow="Paso 7" titulo="De trayectorias a pronóstico">
            <p>Al terminar el bucle hay M historias distintas del mismo paciente. Se resumen así:</p>
            <div className="grid items-center gap-6 md:grid-cols-[1fr_1fr]">
              <ul className="space-y-3 text-sm">
                <li>
                  <b className="text-white">Bandas anuales.</b> Al final de cada año se ordenan los valores de las M trayectorias y se toman los percentiles 10, 50 y 90 de
                  glucosa, insulina, HOMA-IR, reserva β, sensibilidad y grasa.
                </li>
                <li>
                  <b className="text-white">Probabilidad a 5 años.</b> Proporción de trayectorias cuya edad de inflexión cae dentro de los primeros 5 años.
                </li>
                <li>
                  <b className="text-white">Etapa al final del horizonte.</b> Porcentaje de trayectorias en cada etapa el último año; la más frecuente es la “etapa esperada”.
                </li>
                <li>
                  <b className="text-white">Edad mediana de inflexión</b> entre las trayectorias que llegan a diabetes.
                </li>
              </ul>
              <div className="rounded-xl border border-hud-borde bg-hud-panel/60 p-4">
                <IlustracionBandas />
              </div>
            </div>
            <Formula etiqueta="estimador Monte Carlo">
              P(DMT2 ≤ 5 años) = (1 / M) · Σ<sub>m</sub> 𝟙[ edad<sub>inflexión,m</sub> ≤ edad + 5 ]
            </Formula>
            <p className="text-sm">
              Con M = 500 el error estándar de esa probabilidad es como máximo √(0.25 / 500) ≈ 2.2 puntos porcentuales; con M = 100, ≈ 5 puntos. Por eso más
              trayectorias dan bandas más estables.
            </p>
          </Seccion>

          {/* 8. Parámetros */}
          <Seccion id="parametros" eyebrow="Referencia" titulo="Parámetros del modelo">
            <Tabla
              cabecera={["Símbolo", "Valor", "Significado", "Origen"]}
              filas={[
                ["G_basal", "85 mg/dL", "Glucemia basal normal", "Documento"],
                ["I_sec,max", "60 µU/mL", "Secreción máxima posible", "Documento"],
                ["G_act,max", "3500 kcal/sem", "Techo de actividad física", "Documento"],
                ["K_cal", "7700 kcal/kg", "Energía por kg de tejido adiposo", "Documento"],
                ["α_gen", "1.4", "Penalización genética (rango 1.2–1.6)", "Documento (punto medio)"],
                ["θ_umb", "0.5", "Umbral de sobrecarga pancreática (rango 0.4–0.6)", "Documento (punto medio)"],
                ["D_ins,basal", "6.0", "Demanda de insulina con sensibilidad normal", "Calibración"],
                ["k2", "0.00015", "Resistencia inducida por grasa", "Calibración"],
                ["k5", "1.5", "mg/dL de glucosa por µU/mL de déficit", "Calibración"],
                ["k6 · k6b", "0.005 · 0.0015", "Glucotoxicidad sobre T_β y S_I", "Calibración"],
                ["k7", "0.06", "Recuperación semanal por intervención (× dosis)", "Calibración"],
                ["MET", "3.5 · 6 · 8.5", "Caminar · bicicleta/trote · correr", "Compendium of Physical Activities"],
                ["T_β,basal", "0.0005", "Desgaste β sin sobrecarga", "Calibración"],
              ]}
            />
          </Seccion>

          {/* 9. Limitaciones */}
          <Seccion id="limitaciones" eyebrow="Importante" titulo="Alcances y límites">
            <div className="flex gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">
              <TriangleAlert size={20} className="mt-0.5 flex-shrink-0 text-amber-300" />
              <div className="space-y-2 text-sm">
                <p><b className="text-amber-200">Es un pronóstico con incertidumbre, no un diagnóstico.</b> Sirve para conversar con el paciente sobre escenarios, no para decidir un tratamiento.</p>
                <p>Las constantes marcadas como “Calibración” son provisionales: aún no están validadas con datos de SNIS-VE, SEDES La Paz o la IDF.</p>
                <p>La actividad y la ingesta de referencia se derivan del IMC porque el registro todavía no recoge esos datos directamente.</p>
                <p>En pacientes que ya están en prediabetes la calibración actual tiende a sobrestimar la progresión, incluso con intervención.</p>
              </div>
            </div>
          </Seccion>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hud-borde-fuerte bg-hud-acento/10 p-6">
            <div>
              <p className="font-semibold text-white">Ahora míralo en acción</p>
              <p className="text-sm text-hud-suave">Registra a un paciente y compara sus escenarios en el simulador.</p>
            </div>
            <BotonEnlace to={usuario ? "/simulador" : "/login"} icono={<FlaskConical size={16} />}>
              {usuario ? "Abrir el simulador" : "Ingresar para simular"}
            </BotonEnlace>
          </div>
        </article>
      </div>
    </PublicLayout>
  );
}
