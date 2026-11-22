import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Avatar } from "./ui";
import { ROL_ETIQUETA } from "../lib/roles";

export function UserMenu() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alHacerClic(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", alHacerClic);
    document.addEventListener("keydown", alPresionarTecla);
    return () => {
      document.removeEventListener("mousedown", alHacerClic);
      document.removeEventListener("keydown", alPresionarTecla);
    };
  }, []);

  if (!usuario) return null;

  function salir() {
    cerrarSesion();
    navigate("/login");
  }

  const enlace = "block w-full px-4 py-2 text-left text-sm text-hud-texto transition-colors hover:bg-hud-panel-2";

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-hud-panel-2"
      >
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium text-white">{usuario.nombre}</p>
          <p className="text-xs text-hud-tenue">{ROL_ETIQUETA[usuario.rol] ?? usuario.rol}</p>
        </div>
        <Avatar nombre={usuario.nombre} tamano={32} />
        <ChevronDown size={14} className={`text-hud-tenue transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-hud-borde-fuerte bg-hud-panel py-1 shadow-lg shadow-black/10">
          <div className="px-4 py-2.5">
            <p className="truncate text-sm font-medium text-white">{usuario.nombre}</p>
            <p className="truncate text-xs text-hud-tenue">{usuario.correo}</p>
          </div>
          <div className="border-t border-hud-borde" />
          <Link to="/perfil?seccion=datos" onClick={() => setAbierto(false)} className={enlace} role="menuitem">Editar información</Link>
          <Link to="/perfil?seccion=password" onClick={() => setAbierto(false)} className={enlace} role="menuitem">Cambiar contraseña</Link>
          <Link to="/perfil?seccion=terminos" onClick={() => setAbierto(false)} className={enlace} role="menuitem">Términos de uso y acuerdos</Link>
          <div className="border-t border-hud-borde" />
          <button onClick={salir} className={`${enlace} text-rose-400`} role="menuitem">Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
