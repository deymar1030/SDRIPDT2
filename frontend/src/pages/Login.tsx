import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { Aviso, Boton, Campo, Entrada } from "../components/ui";

export default function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("marina.choque@umsa.bo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await iniciarSesion(correo, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthLayout titulo="Iniciar sesión" subtitulo="Pronóstico de progresión a diabetes tipo 2.">
      <form onSubmit={onSubmit} className="space-y-5">
        <Campo etiqueta="Correo" htmlFor="correo">
          <Entrada id="correo" type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Contraseña" htmlFor="password">
          <Entrada id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Campo>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <Boton type="submit" cargando={cargando} icono={<LogIn size={16} />} className="w-full">
          Iniciar sesión
        </Boton>
      </form>

      <p className="mt-6 text-center text-sm text-hud-suave">
        ¿No tienes cuenta?{" "}
        <Link to="/registro" className="font-semibold text-hud-acento hover:text-cyan-300">
          Crear cuenta
        </Link>
      </p>
      <div className="mt-6 rounded-lg border border-hud-borde bg-hud-panel/60 p-3 text-xs text-hud-suave">
        Cuenta de demostración: <span className="font-mono text-cyan-200">marina.choque@umsa.bo</span> /{" "}
        <span className="font-mono text-cyan-200">demo1234</span>
      </div>
    </AuthLayout>
  );
}
