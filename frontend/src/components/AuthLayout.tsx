import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Marca } from "./Shell";
import { CurvaEjemplo } from "./CurvaEjemplo";
import { BotonTema } from "../tema/TemaContext";

export function AuthLayout({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <div className="hidden flex-col justify-between border-r border-hud-borde bg-hud-panel-2 p-12 lg:flex">
        <Link to="/" title="Ir a la página de inicio">
          <Marca tamano="lg" />
        </Link>

        <div>
          <h2 className="max-w-md font-serif text-4xl leading-tight text-white">¿Qué pasaría con tu paciente si no cambia de hábitos?</h2>
          <p className="mt-4 max-w-md text-hud-suave">
            Simula la progresión de la resistencia a la insulina hacia la diabetes tipo 2 y compara escenarios de estilo de vida.
          </p>
          <div className="mt-10">
            <CurvaEjemplo className="max-w-md" />
          </div>
        </div>

        <p className="text-xs text-hud-tenue">Pronóstico con incertidumbre; no es un diagnóstico.</p>
      </div>

      <div className="relative flex items-center justify-center px-4 py-16">
        <div className="absolute inset-x-4 top-4 flex items-center justify-between sm:inset-x-6 sm:top-6">
          <Link to="/" className="text-sm text-hud-suave transition-colors hover:text-hud-acento">← Inicio</Link>
          <BotonTema />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Marca tamano="lg" />
          </div>
          <h1 className="text-3xl text-white">{titulo}</h1>
          <p className="mt-1.5 text-hud-suave">{subtitulo}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
