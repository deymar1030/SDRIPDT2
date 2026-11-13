import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

export type Tema = "dark" | "light";

const CLAVE = "simulador-ir:tema";

function temaInicial(): Tema {
  // index.html ya aplicó el tema antes de pintar; aquí solo se lee.
  const actual = document.documentElement.dataset.theme;
  return actual === "light" ? "light" : "dark";
}

interface TemaCtx {
  tema: Tema;
  alternar: () => void;
}

const Ctx = createContext<TemaCtx | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      /* almacenamiento no disponible: el tema solo dura esta sesión */
    }
  }, [tema]);

  const alternar = useCallback(() => setTema((t) => (t === "dark" ? "light" : "dark")), []);

  return <Ctx.Provider value={{ tema, alternar }}>{children}</Ctx.Provider>;
}

export function useTema() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTema debe usarse dentro de TemaProvider");
  return ctx;
}

/** Botón sol/luna para alternar entre tema claro y oscuro. */
export function BotonTema({ className = "" }: { className?: string }) {
  const { tema, alternar } = useTema();
  const claro = tema === "light";
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={claro ? "Modo oscuro" : "Modo claro"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-hud-borde text-hud-suave transition-colors hover:border-hud-borde-fuerte hover:text-hud-acento focus-visible:outline-2 focus-visible:outline-hud-acento ${className}`}
    >
      {claro ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
