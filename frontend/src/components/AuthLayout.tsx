import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, GitCompareArrows, History, ShieldCheck } from "lucide-react";
import { Marca } from "./Shell";
import { SiluetaHolografica } from "./SiluetaHolografica";
import { BotonTema } from "../tema/TemaContext";

const PUNTOS = [
  { icono: GitCompareArrows, texto: "Compara escenarios: sin cambios frente a una intervención." },
  { icono: History, texto: "Guarda cada simulación y compárala con las siguientes consultas." },
  { icono: ShieldCheck, texto: "Pronóstico con incertidumbre, no un diagnóstico." },
];

/** Pantalla de acceso: a la izquierda la misma silueta holográfica del
 *  panel metabólico (identidad del sistema, siempre oscura), a la derecha
 *  el formulario, que sí sigue el tema elegido. */
export function AuthLayout({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="isla-oscura relative hidden overflow-hidden border-r border-hud-borde lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{
          background:
            "linear-gradient(rgba(125,200,210,0.04) 1px, transparent 1px) 0 0/32px 32px, linear-gradient(90deg, rgba(125,200,210,0.04) 1px, transparent 1px) 0 0/32px 32px, radial-gradient(ellipse at 50% 40%, #12306b 0%, #0a1733 55%, #060d20 100%)",
        }}
      >
        <Link to="/" title="Ir a la página de inicio">
          <Marca tamano="lg" />
        </Link>

        <SiluetaHolografica className="mx-auto my-8 h-[360px] w-[168px]" />

        <div>
          <h2 className="max-w-md text-2xl font-bold leading-snug text-white">
            ¿Qué pasaría con tu paciente si no cambia de hábitos?
          </h2>
          <ul className="mt-5 space-y-3">
            {PUNTOS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-sm text-hud-suave">
                <Icono size={17} className="mt-0.5 flex-shrink-0 text-hud-acento" />
                {texto}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-4 py-16">
        <div className="absolute inset-x-4 top-4 flex items-center justify-between sm:inset-x-6 sm:top-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-hud-suave transition-colors hover:text-hud-acento">
            <ArrowLeft size={15} /> Inicio
          </Link>
          <BotonTema />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Marca tamano="lg" />
          </div>
          <h1 className="text-2xl font-bold text-white">{titulo}</h1>
          <p className="mt-1 text-sm text-hud-suave">{subtitulo}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
