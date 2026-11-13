import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { Aviso, Boton, Campo, Entrada, Selector } from "../components/ui";

const ROLES = [
  { valor: "medico", etiqueta: "Médico/a tratante" },
  { valor: "investigador", etiqueta: "Investigador/a" },
  { valor: "docente", etiqueta: "Docente" },
  { valor: "laboratorio", etiqueta: "Laboratorio clínico" },
];

export default function Register() {
  const { registrar } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("medico");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await registrar(nombre, correo, password, rol);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthLayout titulo="Crear cuenta" subtitulo="Para registrar pacientes y simular su pronóstico.">
      <form onSubmit={onSubmit} className="space-y-5">
        <Campo etiqueta="Nombre completo" htmlFor="nombre">
          <Entrada id="nombre" required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Correo" htmlFor="correo">
          <Entrada id="correo" type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Contraseña" htmlFor="password" ayuda="Mínimo 6 caracteres.">
          <Entrada id="password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Campo>
        <Campo etiqueta="Rol" htmlFor="rol">
          <Selector id="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
            ))}
          </Selector>
        </Campo>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <Boton type="submit" cargando={cargando} icono={<UserPlus size={16} />} className="w-full">
          Crear cuenta
        </Boton>
      </form>

      <p className="mt-6 text-center text-sm text-hud-suave">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="font-semibold text-hud-acento hover:text-cyan-300">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
