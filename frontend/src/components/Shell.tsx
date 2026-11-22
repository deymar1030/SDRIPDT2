import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { LayoutDashboard, FlaskConical, Users, UserCog, Activity, UserPlus, Menu, X } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { BotonEnlace } from "./ui";
import { BotonTema } from "../tema/TemaContext";
import { useAuth } from "../auth/AuthContext";

export function Marca({ tamano = "md" }: { tamano?: "md" | "lg" }) {
  const grande = tamano === "lg";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex items-center justify-center rounded-xl border border-hud-acento/50 bg-hud-acento/15 text-hud-acento  ${grande ? "h-10 w-10" : "h-9 w-9"}`}
      >
        <Activity size={grande ? 20 : 18} />
      </div>
      <div>
        <p className={`font-bold leading-tight text-white ${grande ? "text-base" : "text-sm"}`}>Simulador IR</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-hud-tenue">Laboratorio virtual</p>
      </div>
    </div>
  );
}

const NAV_MEDICO = [
  { to: "/dashboard", label: "Panel principal", icon: LayoutDashboard },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/simulador", label: "Simulador", icon: FlaskConical },
];
const NAV_ADMIN = [{ to: "/usuarios", label: "Usuarios", icon: UserCog }];

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  const { usuario } = useAuth();
  const nav = usuario?.rol === "admin" ? NAV_ADMIN : NAV_MEDICO;
  return (
    <nav className="flex flex-col gap-1">
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={alNavegar}
          className={({ isActive }) =>
            `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-hud-acento/12 text-white" : "text-hud-suave hover:bg-white/5 hover:text-white"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-hud-acento " />}
              <Icon size={17} className={isActive ? "text-hud-acento" : ""} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function Shell({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  const [menuMovil, setMenuMovil] = useState(false);
  const { usuario } = useAuth();
  const esMedico = usuario?.rol !== "admin";

  const contenidoLateral = (
    <>
      <Link to="/" className="px-2" title="Ir a la página de inicio">
        <Marca />
      </Link>
      <div className="mt-8">
        <Navegacion alNavegar={() => setMenuMovil(false)} />
      </div>
      <div className="mt-auto pt-6">
        {esMedico && (
          <BotonEnlace to="/pacientes/nuevo" variante="secundario" icono={<UserPlus size={16} />} className="w-full">
            Nuevo paciente
          </BotonEnlace>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col border-r border-hud-borde bg-hud-fondo/70 px-3 py-5 backdrop-blur lg:flex">
        {contenidoLateral}
      </aside>

      {menuMovil && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuMovil(false)} />
          <aside className="relative flex h-full w-64 flex-col border-r border-hud-borde bg-hud-fondo px-3 py-5">
            <button onClick={() => setMenuMovil(false)} aria-label="Cerrar menú" className="absolute right-3 top-5 text-hud-suave hover:text-white">
              <X size={20} />
            </button>
            {contenidoLateral}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-hud-borde bg-hud-fondo/75 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMenuMovil(true)} aria-label="Abrir menú" className="text-hud-suave hover:text-white lg:hidden">
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-white sm:text-lg">{titulo}</h1>
              {subtitulo && <p className="truncate text-xs text-hud-tenue">{subtitulo}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <BotonTema />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
