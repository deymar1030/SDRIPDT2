import type { ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  Dices,
  FlaskConical,
  GitCompareArrows,
  History,
  ListOrdered,
  ScanHeart,
  Sigma,
  UserRound,
} from "lucide-react";
import { PublicLayout } from "../components/PublicLayout";
import { SiluetaHolografica } from "../components/SiluetaHolografica";
import { COLOR_ETAPA } from "../components/StageBadge";
import { BotonEnlace, tinta } from "../components/ui";
import { useAuth } from "../auth/AuthContext";

/* ---------------- piezas pequeñas ---------------- */

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">{children}</p>;
}

function TituloSeccion({ eyebrow, titulo, texto }: { eyebrow: string; titulo: string; texto?: string }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">{titulo}</h2>
      {texto && <p className="mt-3 text-hud-suave">{texto}</p>}
    </div>
  );
}

/* ---------------- datos ---------------- */

const ETAPAS = [
  { etapa: "sano" as const, nombre: "Sano", criterio: "HOMA-IR < 2.5 y glucosa < 100 mg/dL", texto: "Las células responden bien a la insulina." },
  { etapa: "resistencia" as const, nombre: "Resistencia a la insulina", criterio: "HOMA-IR ≥ 2.5", texto: "El páncreas compensa secretando más insulina." },
  { etapa: "prediabetes" as const, nombre: "Prediabetes", criterio: "Glucosa 100–125 mg/dL o HbA1c 5.7–6.4 %", texto: "La compensación empieza a no alcanzar." },
  { etapa: "diabetes" as const, nombre: "Diabetes tipo 2", criterio: "Glucosa ≥ 126 mg/dL o HbA1c ≥ 6.5 %", texto: "La reserva de células β se agota." },
];

const CARACTERISTICAS = [
  { icono: UserRound, titulo: "Ficha metabólica del paciente", texto: "Registra glucosa, insulina, HbA1c, IMC y antecedentes; el sistema calcula el HOMA-IR y la etapa clínica de hoy." },
  { icono: ScanHeart, titulo: "Panel anatómico", texto: "Páncreas, hígado, tejido adiposo y sangre cambian de color año a año mientras se reproduce la simulación." },
  { icono: GitCompareArrows, titulo: "Escenarios comparables", texto: "Hasta 4 escenarios por corrida: sin cambios, intervención moderada o intensiva, lado a lado." },
  { icono: Dices, titulo: "Monte Carlo con incertidumbre", texto: "Cientos de trayectorias posibles por escenario; se muestra la mediana y la banda donde cae el 80 %." },
  { icono: History, titulo: "Historial de simulaciones", texto: "Cada corrida queda guardada con sus supuestos para compararla con la de la siguiente consulta." },
  { icono: ListOrdered, titulo: "Priorización de riesgo", texto: "Tabla de pacientes ordenada por probabilidad de diabetes a 5 años, para decidir a quién contactar primero." },
];

const PASOS = [
  {
    n: 1,
    imagen: "/images/landing/glucometro.jpg",
    alt: "Persona midiendo su glucosa con un glucómetro",
    titulo: "Registra los laboratorios de hoy",
    texto: "Glucosa e insulina en ayunas, HbA1c, peso y talla. Con eso el modelo estima el estado metabólico oculto del paciente: sensibilidad a la insulina, reserva pancreática y grasa acumulada.",
  },
  {
    n: 2,
    imagen: "/images/landing/alimentacion.jpg",
    alt: "Preparación de una ensalada con verduras frescas",
    titulo: "Plantea escenarios de intervención",
    texto: "Arma cada “¿y si…?” en un panel: cuántas calorías quitar al día, qué ejercicio, cuántos días y minutos, y desde cuándo. El simulador traduce esos hábitos a kcal y los compara con “seguir igual”.",
  },
  {
    n: 3,
    imagen: "/images/landing/explicacion.jpg",
    alt: "Médico explicando resultados a un paciente con una tableta",
    titulo: "Muestra el pronóstico al paciente",
    texto: "Probabilidad de diabetes a 5 años, la etapa esperada al final del horizonte y la evolución año a año en el panel anatómico — una conversación concreta, no una advertencia abstracta.",
  },
];

/* ---------------- página ---------------- */

export default function Landing() {
  const { usuario } = useAuth();
  const destinoPrincipal = usuario ? "/simulador" : "/registro";

  return (
    <PublicLayout>
      {/* ---------- Héroe ---------- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-hud-borde-fuerte bg-hud-acento/10 px-3 py-1 text-xs font-medium text-sky-100">
              <span className="h-1.5 w-1.5 rounded-full bg-hud-acento shadow-[0_0_6px_currentColor]" />
              Dinámica de sistemas + Monte Carlo
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Mira hoy el futuro metabólico de tu paciente
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-hud-suave">
              A partir de sus laboratorios actuales, el simulador proyecta semana a semana cómo podría progresar su
              resistencia a la insulina hacia la diabetes tipo 2 — y cuánto cambia ese futuro con una intervención.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <BotonEnlace to={destinoPrincipal} icono={<FlaskConical size={16} />}>
                {usuario ? "Abrir el simulador" : "Comenzar ahora"}
              </BotonEnlace>
              <BotonEnlace to="/como-funciona" variante="secundario" icono={<Sigma size={16} />}>
                Cómo funciona la simulación
              </BotonEnlace>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-hud-borde pt-6">
              {[
                ["1 semana", "paso de tiempo"],
                ["hasta 20", "años de horizonte"],
                ["500", "trayectorias por escenario"],
              ].map(([valor, etiqueta]) => (
                <div key={etiqueta}>
                  <dt className="sr-only">{etiqueta}</dt>
                  <dd className="font-mono text-xl font-bold text-white">{valor}</dd>
                  <dd className="text-xs text-hud-tenue">{etiqueta}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Foto + tarjetas HUD flotantes */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="relative overflow-hidden rounded-3xl border border-hud-borde-fuerte shadow-[var(--sombra-panel)]">
              <img
                src="/images/landing/hero-consulta.jpg"
                alt="Médica revisando resultados en una tableta junto a su paciente"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060d20]/70 via-transparent to-transparent" />
            </div>

            <div
              className="isla-oscura absolute -bottom-8 -left-3 w-60 rounded-2xl border border-hud-borde-fuerte bg-hud-panel/90 p-4 shadow-2xl backdrop-blur sm:-left-8"
              style={{ animation: "flotar 6s ease-in-out infinite" }}
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300">Prob. diabetes a 5 años</p>
              {[
                { nombre: "Sin cambios", valor: 64, color: "#f43f5e" },
                { nombre: "Intervención intensiva", valor: 21, color: "#34d399" },
              ].map((f) => (
                <div key={f.nombre} className="mt-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-hud-suave">{f.nombre}</span>
                    <span className="font-mono font-bold" style={{ color: f.color }}>{f.valor}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <div className="h-1.5 rounded-full" style={{ width: `${f.valor}%`, backgroundColor: f.color, boxShadow: `0 0 6px ${f.color}` }} />
                  </div>
                </div>
              ))}
              <p className="mt-2.5 text-[10px] text-hud-tenue">Ejemplo ilustrativo</p>
            </div>

            <div
              className="isla-oscura absolute -right-2 -top-6 flex items-center gap-3 rounded-2xl border border-hud-borde-fuerte bg-hud-panel/90 p-3 pr-4 shadow-2xl backdrop-blur sm:-right-6"
              style={{ animation: "flotar 7s ease-in-out infinite", animationDelay: "-3s" }}
            >
              <SiluetaHolografica className="h-16 w-8 overflow-hidden" ecg={false} />
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300">Reserva β</p>
                <p className="font-mono text-lg font-bold text-white">35%</p>
                <p className="text-[10px] font-semibold" style={{ color: "#fb923c" }}>Alterado</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- El problema: progresión ---------- */}
      <section className="border-y border-hud-borde bg-hud-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <TituloSeccion
            eyebrow="El problema"
            titulo="La diabetes tipo 2 se construye en silencio durante años"
            texto="Antes de que la glucosa suba, el cuerpo ya está compensando: el páncreas trabaja de más para vencer la resistencia a la insulina. El simulador modela esa progresión etapa por etapa."
          />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPAS.map((e, i) => {
              const color = COLOR_ETAPA[e.etapa];
              return (
                <li key={e.etapa} className="relative rounded-2xl border border-hud-borde bg-hud-panel/80 p-5 shadow-[var(--sombra-panel)]">
                  <span className="absolute inset-x-5 top-0 h-0.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-hud-tenue">0{i + 1}</span>
                    {i < ETAPAS.length - 1 && <ChevronRight size={16} className="hidden text-hud-tenue lg:block" />}
                  </div>
                  <p className="mt-2 font-semibold" style={{ color: tinta(color) }}>{e.nombre}</p>
                  <p className="mt-1 text-sm text-hud-suave">{e.texto}</p>
                  <p className="mt-3 rounded-md border border-hud-borde bg-hud-fondo/50 px-2 py-1 font-mono text-[11px] text-hud-texto">{e.criterio}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ---------- Características ---------- */}
      <section id="caracteristicas" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <TituloSeccion
            eyebrow="Características"
            titulo="Todo lo que necesitas para una consulta preventiva"
            texto="Del registro del paciente a la comparación de su pronóstico entre consultas, en un solo lugar."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARACTERISTICAS.map(({ icono: Icono, titulo, texto }) => (
              <div
                key={titulo}
                className="group rounded-2xl border border-hud-borde bg-hud-panel/80 p-6 shadow-[var(--sombra-panel)] transition-colors hover:border-hud-borde-fuerte"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-hud-acento/40 bg-hud-acento/10 text-hud-acento transition-shadow group-hover:shadow-[0_0_18px_rgb(34_211_238/0.35)]">
                  <Icono size={19} />
                </div>
                <h3 className="mt-4 font-semibold text-white">{titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-hud-suave">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Flujo de trabajo ---------- */}
      <section id="flujo" className="scroll-mt-20 border-y border-hud-borde bg-hud-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <TituloSeccion eyebrow="Flujo de trabajo" titulo="De los laboratorios a una conversación con el paciente" />
          <div className="mt-12 space-y-14 lg:space-y-20">
            {PASOS.map((p, i) => (
              <div key={p.n} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div className="relative">
                  <img src={p.imagen} alt={p.alt} className="aspect-[16/10] w-full rounded-2xl border border-hud-borde object-cover shadow-[var(--sombra-panel)]" />
                  {p.n === 2 && (
                    <img
                      src="/images/landing/actividad.jpg"
                      alt="Persona descansando sobre un tapete después de hacer ejercicio"
                     
                      className="absolute -bottom-6 -right-3 hidden w-2/5 rounded-xl border-4 border-hud-fondo object-cover shadow-xl sm:block"
                    />
                  )}
                </div>
                <div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hud-acento bg-hud-acento/15 font-mono font-bold text-hud-acento">
                    {p.n}
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-white sm:text-2xl">{p.titulo}</h3>
                  <p className="mt-3 leading-relaxed text-hud-suave">{p.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Adelanto de "Cómo funciona" ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div
          className="isla-oscura relative overflow-hidden rounded-3xl border border-hud-borde-fuerte p-8 sm:p-12"
          style={{
            background:
              "linear-gradient(rgba(56,189,248,0.05) 1px, transparent 1px) 0 0/28px 28px, linear-gradient(90deg, rgba(56,189,248,0.05) 1px, transparent 1px) 0 0/28px 28px, radial-gradient(ellipse at 75% 50%, #12306b 0%, #0a1733 55%, #070f24 100%)",
          }}
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <Eyebrow>Detrás de cada pronóstico</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                52 pasos por año, cientos de futuros posibles
              </h2>
              <p className="mt-3 text-hud-suave">
                Cada semana el modelo sortea cuánto come y cuánto se mueve el paciente, actualiza su grasa corporal, su
                sensibilidad a la insulina y su reserva pancreática con siete reglas (R1–R7), y recalcula la glucosa.
                Repetido cientos de veces, eso da una probabilidad, no una sola respuesta.
              </p>
              <div className="mt-6 grid gap-2 font-mono text-sm sm:grid-cols-2">
                {[
                  "S_I(0) = 6 / D_ins(0)",
                  "I_sec = min(D_ins, C_β·0.6)",
                  "G = 85 + 1.5·max(0, D_ins − I_sec)",
                  "P(DMT2 ≤ 5 años) = n / M",
                ].map((f) => (
                  <code key={f} className="rounded-lg border border-hud-borde bg-hud-fondo/60 px-3 py-2 text-cyan-200">{f}</code>
                ))}
              </div>
              <div className="mt-8">
                <BotonEnlace to="/como-funciona" icono={<Sigma size={16} />}>
                  Ver el procedimiento completo <ArrowRight size={15} />
                </BotonEnlace>
              </div>
            </div>
            <SiluetaHolografica className="mx-auto hidden h-72 w-36 lg:block" />
          </div>
        </div>
      </section>

      {/* ---------- Llamado final ---------- */}
      <section className="border-t border-hud-borde">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">¿Listo para simular tu primer pronóstico?</h2>
            <p className="mt-1 text-hud-suave">Registra a tu paciente con sus laboratorios de hoy y compara sus escenarios en minutos.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <BotonEnlace to={destinoPrincipal} icono={<FlaskConical size={16} />}>
              {usuario ? "Abrir el simulador" : "Crear cuenta"}
            </BotonEnlace>
            {!usuario && <BotonEnlace to="/login" variante="secundario">Ya tengo cuenta</BotonEnlace>}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
