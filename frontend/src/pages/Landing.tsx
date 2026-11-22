import { PublicLayout } from "../components/PublicLayout";
import { CurvaEjemplo } from "../components/CurvaEjemplo";
import { BotonEnlace } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { inicioPorRol } from "../lib/roles";

const PASOS = [
  {
    titulo: "Registra al paciente",
    texto: "Edad, IMC, nivel de sedentarismo y antecedentes familiares. Con esos cinco datos el modelo calcula su sensibilidad inicial a la insulina y la velocidad con que se desgasta.",
  },
  {
    titulo: "Plantea escenarios",
    texto: "Cada «¿y si…?» cambia el nivel de actividad, el IMC o el momento de empezar. Hasta cuatro escenarios se comparan sobre el mismo paciente y con los mismos números aleatorios.",
  },
  {
    titulo: "Lee el pronóstico",
    texto: "Cada escenario se simula cientos de veces. El resultado es una probabilidad de diabetes, el tiempo mediano hasta el diagnóstico y la banda donde cae el 80 % de los casos.",
  },
];

const FIGURAS = [
  ["Perfil metabólico", "Glucemia con su quiebre, secreción de insulina, pérdida de células β y caída de la sensibilidad."],
  ["Antes del diagnóstico", "La glucemia de quienes se diagnostican, alineada al momento del diagnóstico."],
  ["Tiempo libre de diabetes", "Años hasta el diagnóstico mediano de cada escenario frente al horizonte."],
  ["Incidencia acumulada", "Porcentaje de trayectorias diagnosticadas a lo largo del tiempo."],
  ["Dispersión del diagnóstico", "Histograma del año en que se diagnostica cada trayectoria."],
];

export default function Landing() {
  const { usuario } = useAuth();
  const medico = usuario?.rol === "medico";
  const destino = usuario ? (medico ? "/simulador" : inicioPorRol(usuario)) : "/login";

  return (
    <PublicLayout>
      <section className="mx-auto grid max-w-6xl items-center gap-x-16 gap-y-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
        <div>
          <h1 className="text-[40px] leading-[1.08] text-white sm:text-5xl lg:text-[54px]">Qué pasaría con tu paciente si no cambia de hábitos</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-hud-suave">
            Un simulador de la progresión de la resistencia a la insulina hacia la diabetes tipo 2. Proyecta día a día cómo podría evolucionar un paciente y cuánto cambia ese futuro con una intervención.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <BotonEnlace to={destino}>{medico ? "Abrir el simulador" : usuario ? "Ir a usuarios" : "Ingresar"}</BotonEnlace>
            <BotonEnlace to="/como-funciona" variante="secundario">Cómo funciona</BotonEnlace>
          </div>
        </div>
        <CurvaEjemplo className="lg:pl-6" />
      </section>

      <section className="border-y border-hud-borde bg-hud-panel">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="max-w-xl text-3xl text-white">Cómo se usa</h2>
          <ol className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {PASOS.map((p, i) => (
              <li key={p.titulo}>
                <span className="font-serif text-5xl font-semibold leading-none text-hud-borde-fuerte">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{p.titulo}</h3>
                <p className="mt-2 leading-relaxed text-hud-suave">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-x-16 gap-y-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-3xl text-white">Qué muestra</h2>
          <p className="mt-3 max-w-sm text-hud-suave">Las gráficas siguen las del informe del proyecto, para poder contrastarlas con estudios reales como Whitehall II, el DPP y el UKPDS.</p>
        </div>
        <dl className="border-t border-hud-borde-fuerte">
          {FIGURAS.map(([titulo, texto], i) => (
            <div key={titulo} className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-b border-hud-borde py-4 sm:grid-cols-[2.5rem_14rem_1fr]">
              <span className="cifras text-sm text-hud-tenue">{i + 1}</span>
              <dt className="font-medium text-white">{titulo}</dt>
              <dd className="col-start-2 text-sm leading-relaxed text-hud-suave sm:col-start-auto">{texto}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-hud-borde bg-hud-panel-2">
        <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-3xl text-white">Ecuaciones diferenciales, cientos de futuros</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-hud-suave">
              El modelo es el de Topp et al., resuelto con el método de Euler a cinco pasos por día. En cada paso se sortean el envejecimiento, la fluctuación metabólica y la muerte de células β, y se actualizan la sensibilidad, la masa beta, la insulina y la glucosa.
            </p>
            <div className="mt-6">
              <BotonEnlace to="/como-funciona" variante="secundario">Ver las ecuaciones y los parámetros</BotonEnlace>
            </div>
          </div>
          <pre className="cifras self-center overflow-x-auto rounded-md border border-hud-borde bg-hud-panel p-5 font-mono text-[13px] leading-7 text-hud-texto">
{`dS_I = −k_VAT · E_cal · S_I · X_t
dβ   = β · (d₀ + r₁·G − r₂·mult·G²)
dI   = β·σ(G)/V_I − k_I·I
dG   = R₀ − E_G0·G − S_I·I·G`}
          </pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="max-w-2xl text-sm leading-relaxed text-hud-tenue">
          El simulador entrega pronósticos con incertidumbre, no diagnósticos. Las constantes provienen de la literatura y todavía no se validaron con datos locales. Las cuentas las crea el administrador del sistema.
        </p>
      </section>
    </PublicLayout>
  );
}
