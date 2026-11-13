import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, LogIn, Menu, Sigma, X } from "lucide-react";
import { Marca } from "./Shell";
import { BotonEnlace } from "./ui";
import { BotonTema } from "../tema/TemaContext";
import { useAuth } from "../auth/AuthContext";

const ENLACES = [
  { to: "/", etiqueta: "Inicio", ancla: false },
  { to: "/#caracteristicas", etiqueta: "Características", ancla: true },
  { to: "/#flujo", etiqueta: "Flujo de trabajo", ancla: true },
];

/** Marco de las páginas públicas (landing y "Cómo funciona"): barra de
 *  navegación fija, contenido y pie de página. */
export function PublicLayout({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const { pathname, hash } = useLocation();
  const [menu, setMenu] = useState(false);

  // react-router no desplaza a los anclas (#seccion) por sí solo.
  useEffect(() => {
    setMenu(false);
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [pathname, hash]);

  const claseEnlace = (activo: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activo ? "text-white" : "text-hud-suave hover:text-white"}`;

  const acciones = usuario ? (
    <BotonEnlace to="/dashboard" tamano="sm" icono={<LayoutDashboard size={14} />}>Ir al panel</BotonEnlace>
  ) : (
    <>
      <BotonEnlace to="/login" variante="fantasma" tamano="sm" icono={<LogIn size={14} />}>Ingresar</BotonEnlace>
      <BotonEnlace to="/registro" tamano="sm">Crear cuenta</BotonEnlace>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-hud-borde bg-hud-fondo/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Simulador IR — inicio">
            <Marca />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {ENLACES.map((e) => (
              <Link key={e.to} to={e.to} className={claseEnlace(!e.ancla && pathname === "/" && !hash)}>
                {e.etiqueta}
              </Link>
            ))}
            <NavLink
              to="/como-funciona"
              className={({ isActive }) =>
                `ml-1 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-hud-acento bg-hud-acento/15 text-white"
                    : "border-hud-borde-fuerte text-sky-100 hover:border-hud-acento hover:bg-hud-acento/10"
                }`
              }
            >
              <Sigma size={15} className="text-hud-acento" /> Cómo funciona
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <BotonTema />
            <div className="hidden items-center gap-2 sm:flex">{acciones}</div>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-label={menu ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menu}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hud-borde text-hud-suave hover:text-white md:hidden"
            >
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menu && (
          <div className="border-t border-hud-borde bg-hud-fondo px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col" aria-label="Principal (móvil)">
              {ENLACES.map((e) => (
                <Link key={e.to} to={e.to} className="rounded-lg px-3 py-2.5 text-sm text-hud-suave hover:bg-white/5 hover:text-white">
                  {e.etiqueta}
                </Link>
              ))}
              <Link to="/como-funciona" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/5">
                <Sigma size={15} className="text-hud-acento" /> Cómo funciona la simulación
              </Link>
            </nav>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-hud-borde pt-3 sm:hidden">{acciones}</div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-hud-borde bg-hud-panel/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Marca />
            <p className="mt-3 max-w-sm text-sm text-hud-suave">
              Pronóstico individual de progresión de resistencia a la insulina hacia diabetes tipo 2. Proyecto de
              Simulación de Sistemas — UMSA, La Paz.
            </p>
            <p className="mt-3 max-w-sm text-xs text-hud-tenue">
              Herramienta de apoyo para docencia e investigación. No realiza diagnósticos ni reemplaza el criterio clínico.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Explorar</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/#caracteristicas" className="text-hud-suave hover:text-hud-acento">Características</Link></li>
              <li><Link to="/#flujo" className="text-hud-suave hover:text-hud-acento">Flujo de trabajo</Link></li>
              <li><Link to="/como-funciona" className="text-hud-suave hover:text-hud-acento">Cómo funciona la simulación</Link></li>
              <li><Link to={usuario ? "/dashboard" : "/login"} className="text-hud-suave hover:text-hud-acento">{usuario ? "Ir al panel" : "Ingresar"}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Créditos</p>
            <ul className="mt-3 space-y-2 text-xs text-hud-tenue">
              <li>Fotografías: Pexels</li>
              <li>Silueta humana: Wikimedia Commons (CC0)</li>
              <li>Íconos de órganos: Healthicons (CC0)</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
