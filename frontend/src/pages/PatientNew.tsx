import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Save } from "lucide-react";
import { Shell } from "../components/Shell";
import { AreaTexto, Aviso, Boton, BotonEnlace, Campo, Entrada, Panel, Selector, Unidad, tinta } from "../components/ui";
import { api } from "../api/client";

function nivelColor(valor: number, cortes: [number, number, number]) {
  if (valor < cortes[0]) return "#22d3ee";
  if (valor < cortes[1]) return "#facc15";
  if (valor < cortes[2]) return "#fb923c";
  return "#f43f5e";
}

function Calculado({ etiqueta, valor, color }: { etiqueta: string; valor: string | null; color?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-hud-borde bg-hud-fondo/50 px-3 py-2">
      <span className="text-xs uppercase tracking-wider text-hud-suave">{etiqueta}</span>
      <span className="font-mono text-base font-bold" style={{ color: valor && color ? tinta(color) : "var(--color-hud-tenue)" }}>{valor ?? "—"}</span>
    </div>
  );
}

function Interruptor({ activo, onCambio, children }: { activo: boolean; onCambio: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onCambio(!activo)}
      aria-pressed={activo}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
        activo ? "border-hud-acento bg-hud-acento/15 text-white" : "border-hud-borde text-hud-suave hover:text-white"
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded border ${activo ? "border-hud-acento bg-hud-acento text-slate-950" : "border-hud-tenue"}`}>
        {activo && <Check size={12} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

export default function PatientNew() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("Femenino");
  const [peso, setPeso] = useState("");
  const [talla, setTalla] = useState("");
  const [glucosa, setGlucosa] = useState("");
  const [insulina, setInsulina] = useState("");
  const [hba1c, setHba1c] = useState("");
  const [antecedente, setAntecedente] = useState<"desconocido" | "si" | "no">("desconocido");
  const [hipertension, setHipertension] = useState(false);
  const [tabaquismo, setTabaquismo] = useState(false);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const imc = useMemo(() => {
    const p = parseFloat(peso), t = parseFloat(talla);
    if (!p || !t) return null;
    return p / Math.pow(t / 100, 2);
  }, [peso, talla]);

  const homaIR = useMemo(() => {
    const g = parseFloat(glucosa), i = parseFloat(insulina);
    if (!g || !i) return null;
    return (g * i) / 405;
  }, [glucosa, insulina]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!imc) {
      setError("Completa peso y talla para calcular el IMC.");
      return;
    }
    setCargando(true);
    try {
      const paciente = await api.crearPaciente({
        nombre,
        edad: Number(edad),
        sexo,
        imc: Number(imc.toFixed(1)),
        peso: Number(peso),
        talla: Number(talla),
        glucosa: Number(glucosa),
        insulina: Number(insulina),
        hba1c: hba1c ? Number(hba1c) : undefined,
        antecedente_familiar: antecedente === "desconocido" ? null : antecedente === "si",
        hipertension,
        tabaquismo,
        notas: notas || undefined,
      });
      navigate(`/pacientes/${paciente.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar al paciente");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Shell titulo="Registrar paciente" subtitulo="Los campos con laboratorio alimentan directamente el simulador">
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 pb-24">
        <Panel titulo="Datos personales">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre completo" htmlFor="nombre" className="sm:col-span-2">
              <Entrada id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Ana Villarroel" />
            </Campo>
            <Campo etiqueta="Edad (años)" htmlFor="edad">
              <Entrada id="edad" required type="number" min={1} max={110} value={edad} onChange={(e) => setEdad(e.target.value)} />
            </Campo>
            <Campo etiqueta="Sexo" htmlFor="sexo">
              <Selector id="sexo" value={sexo} onChange={(e) => setSexo(e.target.value)}>
                <option>Femenino</option>
                <option>Masculino</option>
                <option>Otro / prefiere no decir</option>
              </Selector>
            </Campo>
          </div>
        </Panel>

        <Panel titulo="Antropometría">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo etiqueta="Peso (kg)" htmlFor="peso">
              <Entrada id="peso" required type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </Campo>
            <Campo etiqueta="Talla (cm)" htmlFor="talla">
              <Entrada id="talla" required type="number" step="0.1" value={talla} onChange={(e) => setTalla(e.target.value)} />
            </Campo>
            <div className="flex items-end">
              <div className="w-full">
                <Calculado etiqueta="IMC" valor={imc ? imc.toFixed(1) : null} color={imc ? nivelColor(imc, [25, 30, 35]) : undefined} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel titulo="Laboratorio actual">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo etiqueta={<>Glucosa en ayunas <Unidad>(mg/dL)</Unidad></>} htmlFor="glucosa">
              <Entrada id="glucosa" required type="number" value={glucosa} onChange={(e) => setGlucosa(e.target.value)} />
            </Campo>
            <Campo etiqueta={<>Insulina en ayunas <Unidad>(µU/mL)</Unidad></>} htmlFor="insulina">
              <Entrada id="insulina" required type="number" step="0.1" value={insulina} onChange={(e) => setInsulina(e.target.value)} />
            </Campo>
            <Campo etiqueta="HbA1c (%) · opcional" htmlFor="hba1c">
              <Entrada id="hba1c" type="number" step="0.1" value={hba1c} onChange={(e) => setHba1c(e.target.value)} />
            </Campo>
          </div>
          <div className="mt-4 sm:w-1/3">
            <Calculado etiqueta="HOMA-IR" valor={homaIR ? homaIR.toFixed(1) : null} color={homaIR ? nivelColor(homaIR, [2.5, 4, 6]) : undefined} />
          </div>
        </Panel>

        <Panel titulo="Antecedentes">
          <div className="space-y-4">
            <Campo etiqueta="Antecedente familiar de diabetes tipo 2" htmlFor="antecedente" ayuda="Si no se sabe, el simulador lo trata como incierto (probabilidad 35%).">
              <Selector id="antecedente" value={antecedente} onChange={(e) => setAntecedente(e.target.value as typeof antecedente)}>
                <option value="desconocido">No se sabe / sin dato</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Selector>
            </Campo>
            <div className="flex flex-wrap gap-2">
              <Interruptor activo={hipertension} onCambio={setHipertension}>Hipertensión</Interruptor>
              <Interruptor activo={tabaquismo} onCambio={setTabaquismo}>Tabaquismo</Interruptor>
            </div>
            <Campo etiqueta="Notas clínicas" htmlFor="notas">
              <AreaTexto id="notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones, tratamiento actual, adherencia…" />
            </Campo>
          </div>
        </Panel>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hud-borde bg-hud-fondo/90 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-3xl items-center justify-end gap-3 px-4 py-3">
            <BotonEnlace to="/pacientes" variante="fantasma">Cancelar</BotonEnlace>
            <Boton type="submit" cargando={cargando} icono={<Save size={16} />}>Registrar paciente</Boton>
          </div>
        </div>
      </form>
    </Shell>
  );
}
