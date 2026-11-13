import type { ReactNode } from "react";
import type { Etapa, Paciente, PuntoAnual } from "../types";
import { useTema } from "../tema/TemaContext";
import { tinta } from "./ui";

// Fondo del panel: rejilla + resplandor central, en la paleta de cada tema.
const FONDO_OSCURO =
  "linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px) 0 0/28px 28px, linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px) 0 0/28px 28px, radial-gradient(ellipse at 50% 40%, #12306b 0%, #0a1733 60%, #070f24 100%)";
const FONDO_CLARO =
  "linear-gradient(rgba(8,145,178,0.07) 1px, transparent 1px) 0 0/28px 28px, linear-gradient(90deg, rgba(8,145,178,0.07) 1px, transparent 1px) 0 0/28px 28px, radial-gradient(ellipse at 50% 40%, #ffffff 0%, #eef5fc 60%, #e2ecf7 100%)";

/** Estado fisiológico que dibuja el panel: labs observables + variables
 *  latentes del modelo (componentes B y C del documento formal). */
export interface EstadoAnatomico {
  glucosa: number;
  insulina: number;
  homaIR: number;
  reserva: number; // C_β, % de capacidad de células beta
  sensibilidad: number; // S_I, 1.0 = sensibilidad normal
  adiposo: number; // M_adip, kg de grasa acumulada
  imc: number;
  hba1c?: number | null;
  etapa: Etapa;
  etapaPct?: Record<Etapa, number>;
}

export function estadoDesdePaciente(p: Paciente): EstadoAnatomico {
  return {
    glucosa: p.glucosa,
    insulina: p.insulina,
    homaIR: p.homaIR,
    reserva: p.estadoLatente.cBeta0,
    sensibilidad: p.estadoLatente.sI0,
    adiposo: p.estadoLatente.mAdip0,
    imc: p.imc,
    hba1c: p.hba1c,
    etapa: p.etapaActual,
  };
}

const ORDEN_ETAPAS: Etapa[] = ["sano", "resistencia", "prediabetes", "diabetes"];

export function estadoDesdeAnio(punto: PuntoAnual): EstadoAnatomico {
  const etapa = ORDEN_ETAPAS.reduce((mejor, e) => (punto.etapaPct[e] > punto.etapaPct[mejor] ? e : mejor), "sano" as Etapa);
  const adiposo = punto.adiposo?.p50 ?? 0;
  return {
    glucosa: punto.glucosa.p50,
    insulina: punto.insulina.p50,
    homaIR: punto.homaIR.p50,
    reserva: punto.reserva.p50,
    // corridas guardadas antes de exponer S_I: se aproxima por R_HOMA = 1/S_I
    sensibilidad: punto.sensibilidad?.p50 ?? 1 / Math.max(punto.homaIR.p50, 0.5),
    adiposo,
    // inversa de M_adip0 = (IMC − 22)·2.5 usada por el motor
    imc: 22 + adiposo / 2.5,
    etapa,
    etapaPct: punto.etapaPct,
  };
}

// ---------------- niveles de alerta (0 normal … 3 crítico) ----------------
const COLORES_NIVEL = ["#22d3ee", "#facc15", "#fb923c", "#f43f5e"];
const TEXTO_NIVEL = ["Normal", "Alerta", "Alterado", "Crítico"];

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

const COLOR_CUERPO: Record<Etapa, [string, string]> = {
  sano: ["#7dd3fc", "#1d4ed8"],
  resistencia: ["#fde68a", "#b45309"],
  prediabetes: ["#fdba74", "#c2410c"],
  diabetes: ["#fda4af", "#be123c"],
};
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
        transition: "background-color 500ms",
      }}
    />
  );
}

function FilaLab({ etiqueta, valor, unidad, nivel, pct }: { etiqueta: string; valor: string; unidad: string; nivel: number; pct: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wider text-hud-suave">{etiqueta}</span>
        <span className="font-mono text-sm font-semibold text-white">
          {valor} <span className="text-[10px] font-normal text-hud-tenue">{unidad}</span>
        </span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-white/10">
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(4, pct))}%`, backgroundColor: COLORES_NIVEL[nivel], boxShadow: `0 0 6px ${COLORES_NIVEL[nivel]}` }}
        />
      </div>
    </div>
  );
}

function PanelOrgano({
  archivo, nombre, valor, detalle, nivel, valorTexto = false,
}: { archivo: string; nombre: string; valor: string; detalle: string; nivel: number; valorTexto?: boolean }) {
  const color = COLORES_NIVEL[nivel];
  return (
    <div
      className="relative flex flex-col justify-between rounded-lg border bg-hud-panel/70 p-3 transition-colors duration-500"
      style={{ borderColor: `${color}66`, boxShadow: `inset 0 0 18px ${color}22` }}
    >
      <span className="absolute left-0 top-0 h-2.5 w-2.5 border-l-2 border-t-2" style={{ borderColor: color }} />
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-2 border-r-2" style={{ borderColor: color }} />
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0" style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
          <IconoOrgano archivo={archivo} color={color} size={30} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase leading-tight tracking-wide text-hud-suave">{nombre}</p>
          <p className={valorTexto ? "text-sm font-bold leading-snug text-white" : "whitespace-nowrap font-mono text-base font-bold text-white"}>
            {valor}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-1 text-[10px]">
        <span className="leading-tight text-hud-tenue">{detalle}</span>
        <span className="whitespace-nowrap font-semibold" style={{ color: tinta(color) }}>{TEXTO_NIVEL[nivel]}</span>
      </div>
    </div>
  );
}

const ETAPA_CORTA: Record<Etapa, string> = {
  sano: "Sano",
  resistencia: "Resistencia",
  prediabetes: "Prediabetes",
  diabetes: "Diabetes",
};

interface Props {
  estado: EstadoAnatomico;
  /** Etiqueta del momento mostrado, ej. "Hoy" o "Año 4 · Sin cambios". */
  momento: string;
  escaneando?: boolean;
  children?: ReactNode;
}

export function PanelAnatomico({ estado, momento, escaneando = false, children }: Props) {
  const nGlucosa = nivelAscendente(estado.glucosa, [100, 110, 126]);
  const nInsulina = nivelAscendente(estado.insulina, [12, 18, 25]);
  const nHoma = nivelAscendente(estado.homaIR, [2.5, 4, 6]);
  const nImc = nivelAscendente(estado.imc, [25, 30, 35]);
  const nHba1c = estado.hba1c != null ? nivelAscendente(estado.hba1c, [5.7, 6.0, 6.5]) : 0;
  const nReserva = nivelDescendente(estado.reserva, [70, 40, 20]);
  const nSensibilidad = nivelDescendente(estado.sensibilidad, [0.4, 0.25, 0.15]);
  const nAdiposo = nivelAscendente(estado.adiposo, [7.5, 20, 30]);
  const nEtapa = ORDEN_ETAPAS.indexOf(estado.etapa);
  const [claro, oscuro] = COLOR_CUERPO[estado.etapa];
  const claroTema = useTema().tema === "light";

  // órganos sobre la silueta (posiciones en % del cuadro del cuerpo)
  const organos = [
    { archivo: "blood-drop", x: 56, y: 27, nivel: nGlucosa, nombre: "Sangre (glucosa)" },
    { archivo: "liver", x: 43, y: 34, nivel: nSensibilidad, nombre: "Hígado / tejido periférico" },
    { archivo: "pancreas", x: 56, y: 37.5, nivel: nReserva, nombre: "Páncreas" },
    { archivo: "tissue", x: 50, y: 44, nivel: nAdiposo, nombre: "Tejido adiposo" },
  ];

  return (
    <div
      className="@container relative overflow-hidden rounded-2xl border border-hud-borde p-5 text-white shadow-[var(--sombra-panel)]"
      style={{ background: claroTema ? FONDO_CLARO : FONDO_OSCURO }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-sky-300">Panel metabólico</p>
          <p className="text-lg font-semibold">{NOMBRE_ETAPA[estado.etapa]}</p>
        </div>
        <span className="rounded-full border border-hud-borde-fuerte bg-hud-acento/10 px-3 py-1 font-mono text-xs text-sky-200">
          {escaneando ? "Simulando…" : momento}
        </span>
      </div>

      {/* El layout se adapta al ancho del propio panel (container queries): 3 columnas
          en la ficha, cuerpo + columna lateral en el simulador, apilado en pantallas chicas. */}
      <div className="grid grid-cols-1 items-center gap-5 @2xl:grid-cols-[1fr_300px] @5xl:grid-cols-[210px_1fr_340px]">
        {/* Laboratorio */}
        <div className="space-y-3.5 rounded-lg border border-hud-borde bg-hud-panel/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Laboratorio</p>
          <FilaLab etiqueta="Glucosa" valor={estado.glucosa.toFixed(0)} unidad="mg/dL" nivel={nGlucosa} pct={((estado.glucosa - 70) / 130) * 100} />
          <FilaLab etiqueta="Insulina" valor={estado.insulina.toFixed(1)} unidad="µU/mL" nivel={nInsulina} pct={(estado.insulina / 40) * 100} />
          <FilaLab etiqueta="HOMA-IR" valor={estado.homaIR.toFixed(1)} unidad="" nivel={nHoma} pct={(estado.homaIR / 10) * 100} />
          {estado.hba1c != null && (
            <FilaLab etiqueta="HbA1c" valor={estado.hba1c.toFixed(1)} unidad="%" nivel={nHba1c} pct={((estado.hba1c - 4) / 6) * 100} />
          )}
          <FilaLab etiqueta={estado.etapaPct ? "IMC estimado" : "IMC"} valor={estado.imc.toFixed(1)} unidad="" nivel={nImc} pct={((estado.imc - 15) / 25) * 100} />
        </div>

        {/* Silueta */}
        <div className="relative order-first mx-auto h-[400px] w-[186px] @2xl:row-span-2 @5xl:order-none @5xl:row-span-1">
          <div
            className="absolute inset-0"
            style={{ filter: `drop-shadow(0 0 10px ${oscuro}) drop-shadow(0 0 22px ${claro}55)`, transition: "filter 600ms" }}
          >
            <div
              className="absolute inset-0 transition-all duration-700"
              style={{
                background: `linear-gradient(180deg, ${claro}ee 0%, ${oscuro}cc 70%, ${oscuro}88 100%)`,
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
          </div>

          {/* línea de escaneo */}
          <div className="pointer-events-none absolute inset-x-[-12px] top-0 h-full overflow-hidden">
            <div
              className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-[#22d3ee66] to-transparent"
              style={{ animation: `escaneo ${escaneando ? "1.1s" : "6s"} linear infinite` }}
            />
          </div>

          {/* ECG sobre el pecho */}
          <svg
            className="pointer-events-none absolute top-[22%] h-10"
            style={{ left: -80, width: "calc(100% + 160px)" }}
            viewBox="0 0 228 40"
            preserveAspectRatio="none"
            fill="none"
          >
            <polyline
              points="0,20 92,20 100,20 106,5 114,35 121,11 126,20 228,20"
              stroke={claroTema ? "#0891b2" : "#67e8f9"}
              strokeWidth="1.6"
              strokeLinejoin="round"
              style={{ strokeDasharray: 260, animation: `ecg ${escaneando ? "0.9s" : "2.4s"} linear infinite`, filter: "drop-shadow(0 0 4px #22d3ee)" }}
            />
          </svg>

          {organos.map((o) => (
            <div
              key={o.archivo}
              title={`${o.nombre}: ${TEXTO_NIVEL[o.nivel]}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${o.x}%`, top: `${o.y}%` }}
            >
              <span
                className="absolute inset-0 -m-1.5 rounded-full"
                style={{ backgroundColor: COLORES_NIVEL[o.nivel], opacity: 0.6, animation: "pulso-organo 1.8s ease-out infinite" }}
              />
              {/* ícono siempre claro para que se lea sobre cualquier color de cuerpo;
                  el estado lo comunican el halo y el resplandor */}
              <div
                className="relative"
                style={{ filter: `drop-shadow(0 0 2px ${COLORES_NIVEL[o.nivel]}) drop-shadow(0 0 6px ${COLORES_NIVEL[o.nivel]})` }}
              >
                <IconoOrgano archivo={o.archivo} color="#f8fafc" size={26} />
              </div>
            </div>
          ))}
        </div>

        {/* Órganos */}
        <div className="grid grid-cols-2 gap-2.5">
          <PanelOrgano archivo="pancreas" nombre="Páncreas" valor={`${estado.reserva.toFixed(0)}%`} detalle="Reserva β (C_β)" nivel={nReserva} />
          <PanelOrgano
            archivo="liver"
            nombre="Hígado y músculo"
            valor={`${Math.min(150, estado.sensibilidad * 100).toFixed(0)}%`}
            detalle="Sensibilidad (S_I)"
            nivel={nSensibilidad}
          />
          <PanelOrgano archivo="tissue" nombre="Tejido adiposo" valor={`${estado.adiposo.toFixed(1)} kg`} detalle="Grasa acumulada" nivel={nAdiposo} />
          <PanelOrgano
            archivo="blood-drop"
            nombre="Metabolismo"
            valor={ETAPA_CORTA[estado.etapa]}
            valorTexto
            detalle="Etapa clínica"
            nivel={Math.max(0, nEtapa)}
          />
        </div>
      </div>

      {children && <div className="mt-5 border-t border-hud-borde pt-4">{children}</div>}
    </div>
  );
}
