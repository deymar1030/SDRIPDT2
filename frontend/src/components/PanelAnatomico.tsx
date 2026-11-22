import type { ReactNode } from "react";
import type { Etapa, Paciente, PuntoSerie } from "../types";
import { COLOR_ETAPA } from "./StageBadge";
import { Muestra, tinta } from "./ui";

const S_I_IDEAL = 1.8;

/** Estado fisiológico que dibuja el panel: glucosa, insulina, masa beta y sensibilidad del modelo de Topp. */
export interface EstadoAnatomico {
  glucosa: number;
  insulina: number;
  homaIR: number;
  reserva: number; // masa beta, % de la masa inicial
  sensibilidad: number; // S_I
  adiposo: number; // kg de grasa por encima de la referencia (IMC 22)
  imc: number;
  hba1c?: number | null;
  etapa: Etapa;
  etapaPct?: Record<Etapa, number>;
}

const grasaDesdeImc = (imc: number) => Math.max(0, (imc - 22) * 2.5);

export function estadoDesdePaciente(p: Paciente): EstadoAnatomico {
  return {
    glucosa: 90,
    insulina: 10,
    homaIR: (90 * 10) / 405,
    reserva: 100,
    sensibilidad: p.estadoLatente.sI0,
    adiposo: grasaDesdeImc(p.imc),
    imc: p.imc,
    etapa: "sano",
  };
}

const ORDEN_ETAPAS: Etapa[] = ["sano", "resistencia", "prediabetes", "diabetes"];

export function estadoDesdeAnio(punto: PuntoSerie, imc: number): EstadoAnatomico {
  const etapa = ORDEN_ETAPAS.reduce((mejor, e) => (punto.etapaPct[e] > punto.etapaPct[mejor] ? e : mejor), "sano" as Etapa);
  return {
    glucosa: punto.glucosa.p50,
    insulina: punto.insulina.p50,
    homaIR: punto.homaIR.p50,
    reserva: punto.masaBeta.p50,
    sensibilidad: punto.sensibilidad.p50,
    adiposo: grasaDesdeImc(imc),
    imc,
    etapa,
    etapaPct: punto.etapaPct,
  };
}

/* niveles de alerta: 0 normal … 3 crítico */
const COLORES_NIVEL = ["#2f7d5b", "#b7791f", "#c2571a", "#b42318"];
const TEXTO_NIVEL = ["Normal", "Atención", "Alterado", "Crítico"];

function nivelAscendente(valor: number, cortes: [number, number, number]) {
  if (valor < cortes[0]) return 0;
  if (valor < cortes[1]) return 1;
  if (valor < cortes[2]) return 2;
  return 3;
}
function nivelDescendente(valor: number, cortes: [number, number, number]) {
  if (valor >= cortes[0]) return 0;
  if (valor >= cortes[1]) return 1;
  if (valor >= cortes[2]) return 2;
  return 3;
}

const NOMBRE_ETAPA: Record<Etapa, string> = {
  sano: "Sano",
  resistencia: "Resistencia a la insulina",
  prediabetes: "Prediabetes",
  diabetes: "Diabetes tipo 2",
};

function IconoOrgano({ archivo, color, size }: { archivo: string; color: string; size: number }) {
  const url = `url(/images/organos/${archivo}.svg)`;
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    />
  );
}

function FilaLab({ etiqueta, valor, unidad, nivel, pct }: { etiqueta: string; valor: string; unidad: string; nivel: number; pct: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-hud-suave">{etiqueta}</span>
        <span className="cifras font-medium text-white">
          {valor} <span className="text-xs font-normal text-hud-tenue">{unidad}</span>
        </span>
      </div>
      <div className="mt-1 h-[3px] bg-hud-panel-2">
        <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(4, pct))}%`, backgroundColor: COLORES_NIVEL[nivel] }} />
      </div>
    </div>
  );
}

interface Props {
  estado: EstadoAnatomico;
  /** Etiqueta del momento mostrado, ej. "Año 4 · Sin cambios". */
  momento: string;
  escaneando?: boolean;
  children?: ReactNode;
}

export function PanelAnatomico({ estado, momento, escaneando = false, children }: Props) {
  const nGlucosa = nivelAscendente(estado.glucosa, [100, 110, 126]);
  const nInsulina = nivelAscendente(estado.insulina, [12, 18, 25]);
  const nHoma = nivelAscendente(estado.homaIR, [2.5, 4, 6]);
  const nImc = nivelAscendente(estado.imc, [25, 30, 35]);
  const nReserva = nivelDescendente(estado.reserva, [85, 70, 55]);
  const nSensibilidad = nivelDescendente((estado.sensibilidad / S_I_IDEAL) * 100, [85, 70, 55]);
  const nAdiposo = nivelAscendente(estado.adiposo, [7.5, 20, 30]);

  const organos = [
    { archivo: "blood-drop", x: 56, y: 27, nivel: nGlucosa, nombre: "Sangre", valor: `${estado.glucosa.toFixed(0)} mg/dL`, detalle: "Glucosa" },
    { archivo: "liver", x: 43, y: 34, nivel: nSensibilidad, nombre: "Hígado y músculo", valor: estado.sensibilidad.toFixed(2), detalle: "Sensibilidad S_I" },
    { archivo: "pancreas", x: 56, y: 37.5, nivel: nReserva, nombre: "Páncreas", valor: `${estado.reserva.toFixed(0)} %`, detalle: "Masa beta" },
    { archivo: "tissue", x: 50, y: 44, nivel: nAdiposo, nombre: "Tejido adiposo", valor: `IMC ${estado.imc.toFixed(1)}`, detalle: "Carga adiposa" },
  ];

  return (
    <figure className="rounded-md border border-hud-borde bg-hud-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hud-borde px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-hud-tenue">Estado metabólico</span>
          <span className="flex items-center gap-2 font-serif text-xl font-semibold text-white">
            <Muestra color={COLOR_ETAPA[estado.etapa]} />
            {NOMBRE_ETAPA[estado.etapa]}
          </span>
        </div>
        <span className="cifras text-sm text-hud-suave">{escaneando ? "Simulando…" : momento}</span>
      </div>

      <div className="@container px-5 py-5">
        <div className="grid grid-cols-1 items-center gap-6 @2xl:grid-cols-[1fr_190px_1fr]">
          <div className="space-y-3.5">
            <p className="text-xs font-medium text-hud-tenue">Laboratorio</p>
            <FilaLab etiqueta="Glucosa" valor={estado.glucosa.toFixed(0)} unidad="mg/dL" nivel={nGlucosa} pct={((estado.glucosa - 70) / 130) * 100} />
            <FilaLab etiqueta="Insulina" valor={estado.insulina.toFixed(1)} unidad="µU/mL" nivel={nInsulina} pct={(estado.insulina / 40) * 100} />
            <FilaLab etiqueta="HOMA-IR" valor={estado.homaIR.toFixed(1)} unidad="" nivel={nHoma} pct={(estado.homaIR / 10) * 100} />
            <FilaLab etiqueta="IMC" valor={estado.imc.toFixed(1)} unidad="kg/m²" nivel={nImc} pct={((estado.imc - 15) / 25) * 100} />
          </div>

          <div className="relative order-first mx-auto h-[340px] w-[158px] @2xl:order-none" aria-hidden="true">
            <div
              className="absolute inset-0 transition-colors duration-700"
              style={{
                backgroundColor: COLOR_ETAPA[estado.etapa],
                opacity: "var(--opacidad-cuerpo)",
                WebkitMaskImage: "url(/images/silueta-humana.svg)",
                maskImage: "url(/images/silueta-humana.svg)",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
            <div className="pointer-events-none absolute inset-x-[-8px] top-0 h-full overflow-hidden">
              <div
                className="absolute inset-x-0 h-px bg-hud-acento/50"
                style={{ animation: `escaneo ${escaneando ? "1.1s" : "6s"} linear infinite` }}
              />
            </div>
            <svg className="pointer-events-none absolute top-[22%] h-8" style={{ left: 0, width: "100%" }} viewBox="0 0 228 40" preserveAspectRatio="none" fill="none">
              <polyline
                points="0,20 92,20 100,20 106,5 114,35 121,11 126,20 228,20"
                className="stroke-hud-borde-fuerte"
                strokeWidth="1.4"
                strokeLinejoin="round"
                style={{ strokeDasharray: 260, animation: `ecg ${escaneando ? "0.9s" : "2.4s"} linear infinite` }}
              />
            </svg>
            {organos.map((o) => (
              <div key={o.archivo} title={`${o.nombre}: ${TEXTO_NIVEL[o.nivel]}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
                <span className="absolute inset-0 rounded-full" style={{ backgroundColor: COLORES_NIVEL[o.nivel], animation: "pulso-organo 2.2s ease-out infinite" }} />
                <span className="relative flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: COLORES_NIVEL[o.nivel] }}>
                  <IconoOrgano archivo={o.archivo} color="#ffffff" size={14} />
                </span>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-hud-tenue">Órganos</p>
            <ul>
              {organos.map((o) => (
                <li key={o.archivo} className="flex items-baseline justify-between gap-3 border-b border-hud-borde py-2 text-sm last:border-b-0">
                  <span>
                    <span className="block text-hud-texto">{o.nombre}</span>
                    <span className="block text-xs text-hud-tenue">{o.detalle}</span>
                  </span>
                  <span className="text-right">
                    <span className="cifras block font-medium text-white">{o.valor}</span>
                    <span className="block text-xs" style={{ color: tinta(COLORES_NIVEL[o.nivel]) }}>{TEXTO_NIVEL[o.nivel]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {children && <figcaption className="border-t border-hud-borde px-5 py-4">{children}</figcaption>}
    </figure>
  );
}
