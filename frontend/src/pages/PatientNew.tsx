import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { Shell } from "../components/Shell";
import { AreaTexto, Aviso, Boton, BotonEnlace, Campo, Entrada, Panel, tinta } from "../components/ui";
import { api } from "../api/client";
import { COLOR_SEDENTARISMO, DETALLE_SEDENTARISMO, NOMBRE_SEDENTARISMO, SEDENTARISMO } from "../lib/perfil";
import type { Sedentarismo } from "../types";

function colorImc(imc: number) {
  if (imc < 25) return "#34b4c4";
  if (imc < 30) return "#facc15";
  if (imc < 35) return "#fb923c";
  return "#f43f5e";
}

function Opcion({ activa, color, titulo, detalle, onClick }: { activa: boolean; color: string; titulo: string; detalle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`rounded-xl border px-4 py-3 text-left transition-colors ${activa ? "bg-white/5 text-white" : "border-hud-borde text-hud-suave hover:text-white"}`}
      style={activa ? { borderColor: color, } : undefined}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, }} />
        {titulo}
      </span>
      <span className="mt-1 block text-xs text-hud-tenue">{detalle}</span>
    </button>
  );
}

export default function PatientNew() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [talla, setTalla] = useState("");
  const [sedentarismo, setSedentarismo] = useState<Sedentarismo>("moderado");
  const [antecedente, setAntecedente] = useState<boolean>(false);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const imcNumero = useMemo(() => {
    const p = parseFloat(peso), t = parseFloat(talla);
    if (!p || !t) return null;
    return Math.round((p / Math.pow(t / 100, 2)) * 10) / 10;
  }, [peso, talla]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const paciente = await api.crearPaciente({
        nombre,
        edad: Number(edad),
        peso: Number(peso),
        talla: Number(talla),
        sedentarismo,
        antecedente_familiar: antecedente,
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
    <Shell titulo="Registrar paciente" subtitulo="El IMC se calcula con el peso y la talla">
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 pb-24">
        <Panel titulo="Datos del paciente">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo etiqueta="Nombre" htmlFor="nombre" className="sm:col-span-3">
              <Entrada id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Ana Villarroel" />
            </Campo>
            <Campo etiqueta="Edad (años)" htmlFor="edad" ayuda="Persona adulta: 18 a 100">
              <Entrada id="edad" required type="number" min={18} max={100} value={edad} onChange={(e) => setEdad(e.target.value)} />
            </Campo>
            <Campo etiqueta="Peso (kg)" htmlFor="peso" ayuda="20 a 300 kg">
              <Entrada id="peso" required type="number" step="0.1" min={20} max={300} value={peso} onChange={(e) => setPeso(e.target.value)} />
            </Campo>
            <Campo etiqueta="Talla (cm)" htmlFor="talla" ayuda="100 a 230 cm">
              <Entrada id="talla" required type="number" step="0.1" min={100} max={230} value={talla} onChange={(e) => setTalla(e.target.value)} />
            </Campo>
            <div className="flex items-start sm:col-span-3">
              <div className="flex w-full items-center justify-between rounded-lg border border-hud-borde bg-hud-fondo/50 px-3 py-2">
                <span className="text-xs uppercase tracking-wider text-hud-suave">IMC calculado</span>
                <span className="font-mono text-sm font-bold" style={{ color: imcNumero ? tinta(colorImc(imcNumero)) : "var(--color-hud-tenue)" }}>
                  {!imcNumero ? "—" : `${imcNumero} kg/m² · ${imcNumero < 18.5 ? "bajo peso" : imcNumero < 25 ? "normal" : imcNumero < 30 ? "sobrepeso" : "obesidad"}`}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel titulo="Sedentarismo" descripcion="Nivel habitual de actividad física del paciente.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SEDENTARISMO.map((nivel) => (
              <Opcion
                key={nivel}
                activa={sedentarismo === nivel}
                color={COLOR_SEDENTARISMO[nivel]}
                titulo={NOMBRE_SEDENTARISMO[nivel]}
                detalle={DETALLE_SEDENTARISMO[nivel]}
                onClick={() => setSedentarismo(nivel)}
              />
            ))}
          </div>
        </Panel>

        <Panel titulo="Antecedentes" descripcion="¿Algún familiar directo tiene diabetes tipo 2?">
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <Opcion activa={antecedente} color="#f43f5e" titulo="Sí" detalle="Mayor carga genética" onClick={() => setAntecedente(true)} />
            <Opcion activa={!antecedente} color="#3fb98a" titulo="No" detalle="Sin carga genética" onClick={() => setAntecedente(false)} />
          </div>
          <div className="mt-4">
            <Campo etiqueta="Notas clínicas · opcional" htmlFor="notas">
              <AreaTexto id="notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones del médico…" />
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
