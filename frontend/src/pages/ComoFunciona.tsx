import { useMemo, useState, type ReactNode } from "react";
import { PublicLayout } from "../components/PublicLayout";
import { BotonEnlace, Campo, Entrada, Selector } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { inicioPorRol } from "../lib/roles";
import { NOMBRE_SEDENTARISMO, SEDENTARISMO, tasaDesgasteAdiposo } from "../lib/perfil";
import type { Sedentarismo } from "../types";

/* Las constantes de esta página son copia de backend/app/motor/parametros.py. */
const K = {
  G_IDEAL: 90,
  I_IDEAL: 10,
  BETA_0: 1000,
  E_G0: 1.4,
  SIGMA_MAX: 50,
  ALPHA: 300,
  V_I: 12,
  D_0: -0.05,
  R_1: 0.001,
  Y_DMT2: 126,
  K_VAT_BASE: 0.015,
  LIMITE_DG: 3.5,
};

const RIESGO_VIDA: Record<Sedentarismo, [number, number]> = { activo: [0.5, 0.7], moderado: [0.9, 1.1], severo: [1.4, 1.8] };

const SECCIONES = [
  { id: "resumen", titulo: "Visión general" },
  { id: "entradas", titulo: "1. Entradas del paciente" },
  { id: "aleatorias", titulo: "2. Variables aleatorias" },
  { id: "ecuaciones", titulo: "3. Ecuaciones del modelo" },
  { id: "integracion", titulo: "4. Integración en el tiempo" },
  { id: "escenarios", titulo: "5. Escenarios" },
  { id: "salidas", titulo: "6. Resultados y gráficas" },
  { id: "parametros", titulo: "7. Parámetros" },
  { id: "codigo", titulo: "8. Dónde está en el código" },
  { id: "limitaciones", titulo: "9. Alcances y límites" },
];

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
    <div className="my-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 overflow-x-auto rounded-md border border-hud-borde bg-hud-panel px-4 py-3">
      <div className="font-serif text-[15px] text-white">{children}</div>
      {etiqueta && <span className="font-mono text-xs text-hud-tenue">{etiqueta}</span>}
    </div>
  );
}

function Seccion({ id, eyebrow, titulo, children }: { id: string; eyebrow: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-hud-borde-fuerte pt-8">
      <p className="text-sm text-hud-tenue">{eyebrow}</p>
      <h2 className="mt-1 text-3xl text-white">{titulo}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-hud-suave">{children}</div>
    </section>
  );
}

function Tabla({ cabecera, filas }: { cabecera: string[]; filas: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-hud-borde bg-hud-panel">
      <table className="w-full text-sm">
        <thead className="bg-hud-panel-2 text-left text-xs text-hud-tenue">
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

function FormaDistribucion({ tipo }: { tipo: "normal" | "uniforme" | "gamma" | "weibull" | "bernoulli" }) {
  const trazo = "stroke-hud-acento";
  return (
    <svg viewBox="0 0 80 36" className="h-9 w-20" aria-hidden="true">
      <line x1="2" y1="33" x2="78" y2="33" className="stroke-hud-borde-fuerte" strokeWidth="1" />
      {tipo === "normal" && <path d="M4 33 C 22 33, 28 4, 40 4 S 58 33, 76 33" fill="none" className={trazo} strokeWidth="2" />}
      {tipo === "uniforme" && <path d="M14 33 V 12 H 66 V 33" fill="none" className={trazo} strokeWidth="2" />}
      {tipo === "gamma" && <path d="M4 33 C 10 33, 14 5, 22 5 S 40 26, 76 31" fill="none" className={trazo} strokeWidth="2" />}
      {tipo === "weibull" && <path d="M4 33 C 16 33, 30 4, 42 5 S 56 20, 62 33" fill="none" className={trazo} strokeWidth="2" />}
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

function Resultado({ etiqueta, valor, nota }: { etiqueta: ReactNode; valor: ReactNode; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hud-borde py-2 first:border-t-0">
      <span className="text-sm text-hud-suave">{etiqueta}</span>
      <span className="text-right">
        <span className="font-mono text-sm font-semibold text-white">{valor}</span>
        {nota && <span className="block text-[11px] text-hud-tenue">{nota}</span>}
      </span>
    </div>
  );
}

function CalculadoraPerfil() {
  const [imc, setImc] = useState("33.5");
  const [sedentarismo, setSedentarismo] = useState<Sedentarismo>("severo");

  const calculo = useMemo(() => {
    const valor = parseFloat(imc);
    if (!valor || valor < 12 || valor > 70) return null;
    const s0 = Math.max(0.5, 1.8 - (valor - 22) * 0.05);
    return { s0, k: tasaDesgasteAdiposo(sedentarismo, valor) };
  }, [imc, sedentarismo]);

  const [bajo, alto] = RIESGO_VIDA[sedentarismo];

  return (
    <div className="rounded-md border border-hud-borde bg-hud-panel p-5">
      <p className="mb-3 font-serif text-lg font-semibold text-white">Pruébalo: del perfil al estado inicial</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="IMC" htmlFor="calc-imc">
          <Entrada id="calc-imc" type="number" step="0.1" value={imc} onChange={(e) => setImc(e.target.value)} />
        </Campo>
        <Campo etiqueta="Sedentarismo" htmlFor="calc-sed">
          <Selector id="calc-sed" value={sedentarismo} onChange={(e) => setSedentarismo(e.target.value as Sedentarismo)}>
            {SEDENTARISMO.map((n) => <option key={n} value={n}>{NOMBRE_SEDENTARISMO[n]}</option>)}
          </Selector>
        </Campo>
      </div>
      <div className="mt-4">
        {calculo ? (
          <>
            <Resultado etiqueta={<>Sensibilidad inicial <V s="I0">S</V></>} valor={calculo.s0.toFixed(3)} nota="max(0.5, 1.8 − (IMC − 22) · 0.05)" />
            <Resultado etiqueta={<>Desgaste adiposo <V s="VAT">k</V></>} valor={calculo.k.toFixed(5)} nota="0.015 · factor · (1 + exceso de IMC · impacto)" />
            <Resultado etiqueta="Resiliencia riesgo_vida" valor={`U(${bajo}, ${alto})`} nota="se sortea una vez por trayectoria" />
          </>
        ) : (
          <p className="text-sm text-hud-tenue">Ingresa un IMC entre 12 y 70.</p>
        )}
      </div>
    </div>
  );
}

export default function ComoFunciona() {
  const { usuario } = useAuth();

  return (
    <PublicLayout>
      <section className="border-b border-hud-borde bg-hud-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <p className="text-sm text-hud-tenue">Metodología</p>
          <h1 className="mt-2 max-w-3xl text-4xl leading-tight text-white sm:text-5xl">Cómo funciona la simulación</h1>
          <p className="mt-4 max-w-3xl text-lg text-hud-suave">
            El pronóstico sale de un sistema de <b className="text-white">ecuaciones diferenciales</b> (modelo de Topp et al.) integrado con el
            método de <b className="text-white">Euler</b> y repetido con <b className="text-white">simulación Monte Carlo</b>: se generan
            cientos de futuros posibles del mismo paciente y se resumen en probabilidades.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
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
          <section id="resumen" className="scroll-mt-24">
            <h2 className="text-3xl text-white">Visión general</h2>
            <p className="mt-3 text-hud-suave">Cada vez que presionas “Ejecutar simulación” ocurre lo siguiente, para cada escenario:</p>
            <ol className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Paciente virtual", "Edad, IMC, sedentarismo y antecedentes"],
                ["Sorteo", "Weibull, Normal, Gamma, Bernoulli y Uniforme"],
                ["Bucle de Euler", "5 pasos por día · Ecuaciones 1 a 5"],
                ["Parada", "Se detiene al llegar a 126 mg/dL"],
                ["Resumen", "Percentiles, probabilidades y gráficas"],
              ].map(([t, d], i) => (
                <li key={t} className="border-t border-hud-borde-fuerte pt-3">
                  <span className="font-serif text-2xl font-semibold text-hud-borde-fuerte">{i + 1}</span>
                  <p className="mt-1 font-semibold text-white">{t}</p>
                  <p className="text-xs text-hud-tenue">{d}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-hud-tenue">
              Cada trayectoria parte de la homeostasis ideal (glucosa {K.G_IDEAL} mg/dL, insulina {K.I_IDEAL} µU/mL, masa beta {K.BETA_0}); lo que
              las diferencia es el azar de cada una: su envejecimiento, su fluctuación metabólica, la velocidad de muerte de sus células β y, si no
              se conoce, su herencia.
            </p>
          </section>

          <Seccion id="entradas" eyebrow="Paso 1 · Informe 3.1 y 3.3" titulo="Entradas del paciente">
            <p>El modelo solo pide cinco datos:</p>
            <Tabla
              cabecera={["Dato", "Para qué se usa"]}
              filas={[
                ["Nombre", "Identifica al paciente."],
                ["Edad", "Fija la fracción de vida transcurrida que alimenta el envejecimiento X_t, y la edad de diagnóstico."],
                ["IMC", "Define la sensibilidad inicial S_I0 y, con el sedentarismo, la tasa de desgaste adiposo k_VAT."],
                ["Sedentarismo (activo, moderado, severo)", "Define k_VAT y el rango de la resiliencia de estilo de vida."],
                ["Antecedentes familiares (sí / no)", "Con herencia, el daño a las células β se amplifica entre 1.2 y 1.6 veces."],
              ]}
            />
            <Formula etiqueta="sensibilidad inicial"><V s="I0">S</V> = max(0.5, 1.8 − (IMC − 22) · 0.05)</Formula>
            <Formula etiqueta="desgaste adiposo"><V s="VAT">k</V> = 0.015 · <V s="base">f</V> · (1 + max(0, IMC − 22) · <V s="imc">i</V>)</Formula>
            <CalculadoraPerfil />
          </Seccion>

          <Seccion id="aleatorias" eyebrow="Paso 2 · Informe 3.2.1" titulo="Variables aleatorias">
            <p>Cinco distribuciones de probabilidad alimentan al modelo; todas se generan con NumPy.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["weibull", "X_t · Envejecimiento y riesgo", "Weibull, κ = 2.5", "Se sortea W una vez por trayectoria: X_t = min(W · (t/T + edad/100) · riesgo_vida, 2)"],
                ["normal", "E_cal_ruido · Fluctuación metabólica", "Normal, μ = 1, σ = 0.05", "Se sortea en cada paso; multiplica el desgaste de S_I"],
                ["gamma", "T_β · Variabilidad de muerte celular", "Gamma, k = 2, θ = 0.5", "Se sortea en cada paso; multiplica la apoptosis de las células β"],
                ["bernoulli", "P_gen · Factor genético", "Bernoulli, p = 0.35", "Si el antecedente es desconocido; si se informa, queda fijo"],
                ["uniforme", "riesgo_vida y a_gen", "Uniforme por nivel", "activo U(0.5, 0.7) · moderado U(0.9, 1.1) · severo U(1.4, 1.8) · a_gen U(1.2, 1.6)"],
              ].map(([forma, titulo, dist, uso]) => (
                <div key={titulo} className="flex gap-3 border-t border-hud-borde pt-3">
                  <FormaDistribucion tipo={forma as "normal"} />
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{titulo}</p>
                    <p className="font-mono text-xs text-hud-acento">{dist}</p>
                    <p className="mt-1 text-xs text-hud-tenue">{uso}</p>
                  </div>
                </div>
              ))}
            </div>
          </Seccion>

          <Seccion id="ecuaciones" eyebrow="Paso 3 · Informe 3.2.2" titulo="Ecuaciones del modelo">
            <p>Cuatro variables de estado evolucionan juntas: sensibilidad <V s="I">S</V>, masa beta β, insulina <V>I</V> y glucosa <V>G</V>.</p>
            <h3 className="font-semibold text-white">Ecuación 1 · Degradación de la sensibilidad</h3>
            <Formula etiqueta="Ec. 1">d<V s="I">S</V> = −<V s="VAT">k</V> · <V s="cal">E</V> · <V s="I">S</V> · <V s="t">X</V></Formula>
            <h3 className="font-semibold text-white">Ecuación 2 · Glucotoxicidad</h3>
            <Formula etiqueta="Ec. 2">mult = 1 (G ≤ 105) · 1.5 (≤ 115) · 3 (&lt; 126) · 10 (≥ 126), cada uno × <V s="gen">a</V> · <V s="β">T</V></Formula>
            <h3 className="font-semibold text-white">Ecuación 3 · Masa de células beta</h3>
            <Formula etiqueta="Ec. 3">dβ = β · (<V s="0">d</V> + <V s="1">r</V> · G − <V s="2">r</V> · mult · G²)</Formula>
            <h3 className="font-semibold text-white">Ecuación 4 · Insulina</h3>
            <Formula etiqueta="Ec. 4">d<V>I</V> = β · σ(G) / <V s="I">V</V> − <V s="I">k</V> · <V>I</V> , σ(G) = σ<sub>max</sub> · G² / (α² + G²)</Formula>
            <h3 className="font-semibold text-white">Ecuación 5 · Glucosa</h3>
            <Formula etiqueta="Ec. 5">d<V>G</V> = <V s="0">R</V> − <V s="G0">E</V> · G − <V s="I">S</V> · <V>I</V> · G</Formula>
            <h3 className="font-semibold text-white">Ecuación 6 · Condición de parada</h3>
            <Formula etiqueta="Ec. 6"><V s="diag">T</V> = tiempo del primer paso con G ≥ 126 mg/dL</Formula>
            <p>
              Antes de empezar, <V s="0">R</V>, <V s="I">k</V> y <V s="2">r</V> se calculan para que G = 90 e I = 10 sean un equilibrio exacto con la
              sensibilidad inicial del paciente. Mientras la sensibilidad cae, la insulina compensa; cuando la glucosa pasa de 105 mg/dL empieza la
              glucotoxicidad y las células β colapsan: de ahí el quiebre brusco antes del diagnóstico.
            </p>
          </Seccion>

          <Seccion id="integracion" eyebrow="Paso 4 · Informe 3.2.2" titulo="Integración en el tiempo">
            <p>
              Las ecuaciones se resuelven con el método de Euler hacia adelante. El tiempo del modelo se mide en meses de 30 días y cada día se
              divide en 5 pasos (Δt = 1/150 de mes) para que la insulina, que reacciona rápido, no oscile. Las trayectorias se calculan todas a la vez, en paralelo, con NumPy.
            </p>
            <Tabla
              cabecera={["Elemento", "Valor"]}
              filas={[
                ["Paso de integración", "1/5 de día"],
                ["Registro de resultados", "cada trimestre (4 puntos por año)"],
                ["Año", "365 días"],
                ["Horizonte", "1 a 20 años, a elección"],
                ["Fracción de vida del envejecimiento", "paso / (95 − edad en pasos) + edad / 100"],
              ]}
            />
            <p className="text-sm text-hud-tenue">El comportamiento del modelo no depende del horizonte elegido: un horizonte corto solo recorta la película.</p>
          </Seccion>

          <Seccion id="escenarios" eyebrow="Paso 5 · Informe 3.4.1" titulo="Escenarios de estilo de vida">
            <p>
              Un escenario cambia el sedentarismo y/o el IMC del paciente desde cierto año; el resto de la simulación es idéntico y usa los mismos
              números aleatorios, de modo que la diferencia entre escenarios se debe solo al cambio.
            </p>
            <Tabla
              cabecera={["Escenario", "Efecto"]}
              filas={[
                ["Sin cambios", "El paciente mantiene su estilo de vida."],
                ["Moderada", "Un nivel menos sedentario y −3.5 % de IMC (sin bajar de 22)."],
                ["Intensiva", "Pasa a activo y −7 % de IMC (sin bajar de 22)."],
                ["Personalizada", "Eliges el nivel de actividad, el IMC objetivo y el año de inicio."],
              ]}
            />
          </Seccion>

          <Seccion id="salidas" eyebrow="Paso 6 · Informe 3.4.2 y 3.4.3" titulo="Resultados y gráficas">
            <p>El simulador muestra las mismas gráficas del informe, calculadas sobre todas las trayectorias:</p>
            <Tabla
              cabecera={["Gráfica", "Qué muestra"]}
              filas={[
                ["Perfil metabólico (4 gráficas)", "Glucemia con su quiebre, HOMA-β, pérdida de células β con las líneas de 40 % y 63 %, y caída de la sensibilidad."],
                ["Antes del diagnóstico", "Glucemia alineada al momento del diagnóstico: plana durante años y con quiebre al final (contraste con Whitehall II)."],
                ["Tiempo libre de diabetes", "Años hasta el diagnóstico mediano por escenario, con el horizonte máximo (contraste con el DPP)."],
                ["Incidencia acumulada", "Porcentaje de trayectorias diagnosticadas en el tiempo."],
                ["Dispersión del diagnóstico", "Histograma del año de diagnóstico de las trayectorias."],
              ]}
            />
            <p className="text-sm text-hud-tenue">
              En la gráfica de una trayectoria se muestra la simulación cuyo diagnóstico está más cerca de la mediana. Con “Mediana y banda”
              se ve el percentil 10 a 90 del conjunto.
            </p>
          </Seccion>

          <Seccion id="parametros" eyebrow="Referencia" titulo="Parámetros del modelo">
            <Tabla
              cabecera={["Parámetro", "Valor", "Significado"]}
              filas={[
                [<V key="eg" s="G0">E</V>, K.E_G0, "Consumo de glucosa independiente de insulina"],
                [<span key="sm">σ<sub>max</sub></span>, K.SIGMA_MAX, "Secreción máxima de insulina"],
                ["α", K.ALPHA, "Glucosa de media saturación de la secreción"],
                [<V key="vi" s="I">V</V>, K.V_I, "Volumen de distribución de la insulina"],
                [<V key="d0" s="0">d</V>, K.D_0, "Mortalidad basal de células β"],
                [<V key="r1" s="1">r</V>, K.R_1, "Proliferación de células β"],
                [<V key="b0" s="0">β</V>, K.BETA_0, "Masa beta inicial"],
                [<V key="kv" s="VAT base">k</V>, K.K_VAT_BASE, "Desgaste adiposo base"],
                [<V key="yd" s="DMT2">Y</V>, K.Y_DMT2, "Umbral diagnóstico (mg/dL)"],
                ["Δ G máx.", K.LIMITE_DG, "Máxima velocidad de cambio de la glucemia (mg/dL por mes)"],
              ]}
            />
          </Seccion>

          <Seccion id="codigo" eyebrow="Para revisar" titulo="Dónde está cada parte del informe en el código">
            <p>El motor está en <code className="font-mono text-hud-acento">backend/app/motor/</code>, con un archivo por sección del informe.</p>
            <Tabla
              cabecera={["Informe", "Archivo", "Contenido"]}
              filas={[
                ["3.2.1 Constantes", "parametros.py", "Constantes de Topp, perfiles de sedentarismo y límites"],
                ["3.2.1 Variables aleatorias", "variables_aleatorias.py", "Weibull, Normal, Gamma, Bernoulli y Uniforme"],
                ["3.2.2 Ecuaciones 1 a 5", "ecuaciones.py", "Una función por ecuación y el balance homeostático"],
                ["3.3.1 PacienteVirtual", "paciente.py", "S_I0, k_VAT, riesgo_vida y a_gen"],
                ["3.3.1 SimuladorClinico y Ec. 6", "simulador.py", "Bucle de Euler y condición de parada"],
                ["3.4.1 Escenarios", "escenarios.py", "Cambios de estilo de vida"],
                ["3.4.2 Índices clínicos", "indices_clinicos.py", "HOMA-IR, HOMA-β, déficit beta y etapa"],
                ["3.4.2 y 3.4.3 Gráficos", "resultados.py", "Bandas, trayectoria individual y pre-diagnóstico"],
              ]}
            />
          </Seccion>

          <Seccion id="limitaciones" eyebrow="Importante" titulo="Alcances y límites">
            <div className="border-l-4 border-amber-300 bg-amber-300/10 px-4 py-3 text-amber-100">
              <div className="space-y-2 text-sm">
                <p><b className="text-amber-200">Es un pronóstico con incertidumbre, no un diagnóstico.</b> Sirve para conversar con el paciente sobre escenarios, no para decidir un tratamiento.</p>
                <p>Las constantes vienen de Topp et al. y se ajustó la velocidad máxima de cambio de la glucemia para que, al diagnóstico, la pérdida de células β sea de 50–60 %, como reporta el UKPDS. Todavía no se validó con datos locales.</p>
                <p>Todo paciente parte de glucosa 90 mg/dL e insulina 10 µU/mL: no se usan laboratorios propios del paciente.</p>
                <p>Los escenarios suponen que el cambio de estilo de vida se cumple por completo desde su inicio.</p>
              </div>
            </div>
          </Seccion>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hud-borde-fuerte pt-8">
            <div>
              <p className="font-serif text-xl font-semibold text-white">Ahora míralo en acción</p>
              <p className="text-sm text-hud-suave">Registra a un paciente y compara sus escenarios en el simulador.</p>
            </div>
            <BotonEnlace to={usuario?.rol === "medico" ? "/simulador" : usuario ? inicioPorRol(usuario) : "/login"}>
              {usuario?.rol === "medico" ? "Abrir el simulador" : usuario ? "Ir a usuarios" : "Ingresar para simular"}
            </BotonEnlace>
          </div>
        </article>
      </div>
    </PublicLayout>
  );
}
