import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, FileText, KeyRound, LogOut, UserCog } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { DoctorBadge } from "./DoctorBadge";
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

  const enlace = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-hud-texto transition-colors hover:bg-hud-acento/10";

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/5"
      >
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-semibold text-white">{usuario.nombre}</p>
          <p className="text-xs text-hud-tenue">{ROL_ETIQUETA[usuario.rol] ?? usuario.rol}</p>
        </div>
        <DoctorBadge size={36} />
        <ChevronDown size={15} className={`text-hud-suave transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-hud-borde-fuerte bg-hud-panel p-2 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 px-2 py-2">
            <DoctorBadge size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{usuario.nombre}</p>
              <p className="truncate text-xs text-hud-tenue">{usuario.correo}</p>
            </div>
          </div>
          <div className="my-1.5 border-t border-hud-borde" />
          <Link to="/perfil?seccion=datos" onClick={() => setAbierto(false)} className={enlace} role="menuitem">
            <UserCog size={16} className="text-hud-acento" /> Editar información
          </Link>
          <Link to="/perfil?seccion=password" onClick={() => setAbierto(false)} className={enlace} role="menuitem">
            <KeyRound size={16} className="text-hud-acento" /> Cambiar contraseña
          </Link>
          <Link to="/perfil?seccion=terminos" onClick={() => setAbierto(false)} className={enlace} role="menuitem">
            <FileText size={16} className="text-hud-acento" /> Términos de uso y acuerdos
          </Link>
          <div className="my-1.5 border-t border-hud-borde" />
          <button onClick={salir} className={`${enlace} text-rose-300 hover:bg-rose-500/10`} role="menuitem">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
