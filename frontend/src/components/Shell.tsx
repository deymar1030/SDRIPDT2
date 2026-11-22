import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { BotonTema } from "../tema/TemaContext";
import { useAuth } from "../auth/AuthContext";

export function Marca({ tamano = "md" }: { tamano?: "md" | "lg" }) {
  return (
    <span className="flex items-baseline gap-2.5">
      <span className={`font-serif font-semibold leading-none tracking-tight text-white ${tamano === "lg" ? "text-[26px]" : "text-[21px]"}`}>Simulador IR</span>
      <span className="hidden text-xs text-hud-tenue sm:inline">Resistencia a la insulina y DMT2</span>
    </span>
  );
}

const NAV_MEDICO = [
  { to: "/dashboard", label: "Panel principal" },
  { to: "/pacientes", label: "Pacientes" },
  { to: "/simulador", label: "Simulador" },
];
const NAV_ADMIN = [{ to: "/usuarios", label: "Usuarios" }];

export function Shell({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  const [menuMovil, setMenuMovil] = useState(false);
  const { usuario } = useAuth();
  const nav = usuario?.rol === "admin" ? NAV_ADMIN : NAV_MEDICO;

  const claseEnlace = ({ isActive }: { isActive: boolean }) =>
    `-mb-px border-b-2 py-[17px] text-sm transition-colors ${isActive ? "border-hud-acento font-medium text-white" : "border-transparent text-hud-suave hover:text-white"}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-hud-borde bg-hud-fondo/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-end justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-end gap-8">
            <Link to="/" title="Ir a la página de inicio" className="self-center">
              <Marca />
            </Link>
            <nav className="hidden items-end gap-6 md:flex" aria-label="Principal">
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} className={claseEnlace}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 self-center">
            <BotonTema />
            <UserMenu />
            <button onClick={() => setMenuMovil((v) => !v)} aria-label={menuMovil ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuMovil} className="flex h-9 w-9 items-center justify-center rounded-md text-hud-suave hover:bg-hud-panel-2 md:hidden">
              {menuMovil ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuMovil && (
          <nav className="border-t border-hud-borde bg-hud-fondo px-4 py-2 md:hidden" aria-label="Principal">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setMenuMovil(false)}
                className={({ isActive }) => `block py-2.5 text-sm ${isActive ? "font-medium text-white" : "text-hud-suave"}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-[32px] leading-tight text-white sm:text-4xl">{titulo}</h1>
          {subtitulo && <p className="mt-1.5 max-w-2xl text-hud-suave">{subtitulo}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
