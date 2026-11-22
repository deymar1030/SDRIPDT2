import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Marca } from "./Shell";
import { BotonEnlace } from "./ui";
import { BotonTema } from "../tema/TemaContext";
import { useAuth } from "../auth/AuthContext";
import { inicioPorRol } from "../lib/roles";

const ENLACES = [
  { to: "/", etiqueta: "Inicio", fin: true },
  { to: "/como-funciona", etiqueta: "Cómo funciona", fin: false },
];

/** Marco de las páginas públicas: barra superior, contenido y pie de página. */
export function PublicLayout({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const { pathname, hash } = useLocation();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [pathname, hash]);

  const accion = usuario ? (
    <BotonEnlace to={inicioPorRol(usuario)} tamano="sm">{usuario.rol === "admin" ? "Ir a usuarios" : "Ir al panel"}</BotonEnlace>
  ) : (
    <BotonEnlace to="/login" tamano="sm">Ingresar</BotonEnlace>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-hud-borde bg-hud-fondo/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-10">
            <Link to="/" aria-label="Simulador IR, inicio"><Marca /></Link>
            <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
              {ENLACES.map((e) => (
                <NavLink key={e.to} to={e.to} end={e.fin} className={({ isActive }) => `text-sm transition-colors ${isActive ? "font-medium text-white" : "text-hud-suave hover:text-white"}`}>
                  {e.etiqueta}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <BotonTema />
            <div className="hidden sm:block">{accion}</div>
            <button onClick={() => setMenu((m) => !m)} aria-label={menu ? "Cerrar menú" : "Abrir menú"} aria-expanded={menu} className="flex h-9 w-9 items-center justify-center rounded-md text-hud-suave hover:bg-hud-panel-2 md:hidden">
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menu && (
          <div className="border-t border-hud-borde bg-hud-fondo px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col" aria-label="Principal (móvil)">
              {ENLACES.map((e) => (
                <Link key={e.to} to={e.to} className="py-2.5 text-sm text-hud-suave hover:text-white">{e.etiqueta}</Link>
              ))}
            </nav>
            <div className="mt-3 sm:hidden">{accion}</div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-hud-borde">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-x-12 gap-y-6 px-4 py-10 sm:px-6">
          <div className="max-w-md">
            <Marca />
            <p className="mt-3 text-sm text-hud-suave">Proyecto de Simulación de Sistemas, UMSA, La Paz. Herramienta de apoyo para docencia e investigación; no realiza diagnósticos ni reemplaza el criterio clínico.</p>
          </div>
          <div className="text-xs leading-relaxed text-hud-tenue">
            <p>Silueta humana: Wikimedia Commons (CC0).</p>
            <p>Íconos de órganos: Healthicons (CC0).</p>
            <p>Tipografías: Source Serif 4 e IBM Plex (SIL OFL).</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
