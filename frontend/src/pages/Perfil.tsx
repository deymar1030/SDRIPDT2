import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, KeyRound, Save, ShieldAlert, UserCog } from "lucide-react";
import { Shell } from "../components/Shell";
import { DoctorBadge } from "../components/DoctorBadge";
import { Aviso, Boton, Campo, Entrada, Panel } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { ROL_ETIQUETA } from "../lib/roles";

const SECCIONES = [
  { valor: "datos", etiqueta: "Datos personales", icono: UserCog },
  { valor: "password", etiqueta: "Seguridad", icono: KeyRound },
  { valor: "terminos", etiqueta: "Términos de uso", icono: FileText },
] as const;


function SeccionDatos() {
  const { usuario, actualizarUsuario } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [correo, setCorreo] = useState(usuario?.correo ?? "");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      actualizarUsuario(await api.actualizarPerfil(nombre, correo));
      setMensaje("Datos actualizados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Panel titulo="Datos personales" descripcion="Cómo te identificas en el sistema.">
      <form onSubmit={onSubmit} className="max-w-md space-y-5">
        <Campo etiqueta="Nombre completo" htmlFor="nombre">
          <Entrada id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Correo" htmlFor="correo">
          <Entrada id="correo" required type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Rol" htmlFor="rol" ayuda="El rol lo asigna la administración del sistema.">
          <Entrada id="rol" disabled value={usuario ? ROL_ETIQUETA[usuario.rol] ?? usuario.rol : ""} />
        </Campo>
        {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={cargando} icono={<Save size={16} />}>Guardar cambios</Boton>
      </form>
    </Panel>
  );
}

function SeccionPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    if (nueva !== confirmar) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    setCargando(true);
    try {
      await api.cambiarPassword(actual, nueva);
      setMensaje("Contraseña actualizada.");
      setActual("");
      setNueva("");
      setConfirmar("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Panel titulo="Seguridad" descripcion="Cambia la contraseña con la que inicias sesión.">
      <form onSubmit={onSubmit} className="max-w-md space-y-5">
        <Campo etiqueta="Contraseña actual" htmlFor="actual">
          <Entrada id="actual" required type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
        </Campo>
        <Campo etiqueta="Nueva contraseña" htmlFor="nueva" ayuda="Mínimo 6 caracteres.">
          <Entrada id="nueva" required type="password" minLength={6} autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </Campo>
        <Campo etiqueta="Confirmar nueva contraseña" htmlFor="confirmar">
          <Entrada id="confirmar" required type="password" minLength={6} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        </Campo>
        {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={cargando} icono={<KeyRound size={16} />}>Cambiar contraseña</Boton>
      </form>
    </Panel>
  );
}

function SeccionTerminos() {
  return (
    <Panel titulo="Términos de uso y acuerdos">
      <div className="max-w-2xl space-y-5 text-sm leading-relaxed text-hud-texto">
        <div className="flex gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">
          <ShieldAlert size={20} className="mt-0.5 flex-shrink-0 text-amber-300" />
          <div>
            <p className="font-semibold text-amber-200">Esta herramienta no realiza diagnósticos.</p>
            <p className="mt-1">
              Es un apoyo de simulación para laboratorios e investigación. Los pronósticos que genera son trayectorias
              simuladas con incertidumbre a partir de los datos actuales de cada paciente — no una certeza, y nunca
              reemplazan el criterio clínico del personal médico.
            </p>
          </div>
        </div>

        <section>
          <h3 className="mb-1 font-semibold text-white">Sobre el modelo</h3>
          <p className="text-hud-suave">
            El motor de pronóstico resuelve con el método de Euler las ecuaciones diferenciales del modelo de Topp et al.
            y repite la simulación con Monte Carlo. Sus constantes vienen de la literatura; todavía no se validaron con
            datos locales de SNIS-VE, SEDES La Paz o la IDF, por lo que los resultados son orientativos.
          </p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-white">Datos de los pacientes</h3>
          <p className="text-hud-suave">
            Este es un prototipo de uso local. Los pacientes registrados aquí son de ejemplo o de prueba; no se debe
            cargar información real de pacientes sin la autorización y las medidas de protección de datos que
            correspondan en tu institución.
          </p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-white">Responsabilidad</h3>
          <p className="text-hud-suave">
            Al usar el sistema, aceptas que las probabilidades y trayectorias mostradas son estimaciones con fines de
            apoyo a la decisión y docencia/investigación, y que cualquier decisión clínica permanece bajo la
            responsabilidad del profesional de salud a cargo.
          </p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-white">Créditos de imágenes</h3>
          <p className="text-hud-suave">
            Silueta humana: Wikimedia Commons (CC0). Íconos de órganos: Healthicons (CC0). Fotografías: Pexels.
          </p>
        </section>
      </div>
    </Panel>
  );
}

export default function Perfil() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const seccion = params.get("seccion") ?? "datos";

  return (
    <Shell titulo="Mi perfil">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          {usuario && (
            <Panel esquinas>
              <div className="flex flex-col items-center text-center">
                <DoctorBadge size={64} />
                <p className="mt-3 font-semibold text-white">{usuario.nombre}</p>
                <p className="text-xs text-hud-tenue">{usuario.correo}</p>
                <span className="mt-2 rounded-full border border-hud-borde-fuerte bg-hud-acento/10 px-2.5 py-0.5 text-xs text-cyan-200">
                  {ROL_ETIQUETA[usuario.rol] ?? usuario.rol}
                </span>
              </div>
            </Panel>
          )}
          <nav className="space-y-1 rounded-2xl border border-hud-borde bg-hud-panel/80 p-2">
            {SECCIONES.map(({ valor, etiqueta, icono: Icono }) => (
              <button
                key={valor}
                onClick={() => setParams({ seccion: valor })}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  seccion === valor ? "bg-hud-acento/12 text-white" : "text-hud-suave hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icono size={16} className={seccion === valor ? "text-hud-acento" : ""} /> {etiqueta}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-w-0">
          {seccion === "datos" && <SeccionDatos />}
          {seccion === "password" && <SeccionPassword />}
          {seccion === "terminos" && <SeccionTerminos />}
        </div>
      </div>
    </Shell>
  );
}
