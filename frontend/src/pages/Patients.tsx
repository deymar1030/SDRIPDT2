import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Search, UserPlus, Users } from "lucide-react";
import { Shell } from "../components/Shell";
import { SedentarismoBadge } from "../components/SedentarismoBadge";
import { Aviso, Avatar, BotonEnlace, Cargando, Panel, Vacio, claseTabla } from "../components/ui";
import { api } from "../api/client";
import { NOMBRE_SEDENTARISMO, SEDENTARISMO } from "../lib/perfil";
import type { Paciente, Sedentarismo } from "../types";

export default function Patients() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Sedentarismo | "todos">("todos");

  useEffect(() => {
    api.listarPacientes().then(setPacientes).catch((e) => setError(e.message));
  }, []);

  const filtrados = useMemo(() => {
    if (!pacientes) return [];
    const q = busqueda.trim().toLowerCase();
    return pacientes.filter((p) => p.nombre.toLowerCase().includes(q) && (filtro === "todos" || p.sedentarismo === filtro));
  }, [pacientes, busqueda, filtro]);

  return (
    <Shell titulo="Pacientes" subtitulo={pacientes ? `${pacientes.length} registrados` : undefined}>
      {error && <div className="mb-4"><Aviso tipo="error">{error}</Aviso></div>}

      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hud-tenue" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre…"
              aria-label="Buscar paciente"
              className="w-full rounded-lg border border-hud-borde bg-hud-fondo/60 py-2 pl-9 pr-3 text-sm text-hud-texto placeholder:text-hud-tenue focus:border-hud-acento focus:outline-none focus:ring-2 focus:ring-hud-acento/25"
            />
          </div>
          <BotonEnlace to="/pacientes/nuevo" icono={<UserPlus size={16} />}>Registrar paciente</BotonEnlace>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["todos", ...SEDENTARISMO] as const).map((valor) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filtro === valor ? "border-hud-acento bg-hud-acento/15 text-white" : "border-hud-borde text-hud-suave hover:text-white"
              }`}
            >
              {valor === "todos" ? "Todos" : `Sedentarismo ${NOMBRE_SEDENTARISMO[valor].toLowerCase()}`}
            </button>
          ))}
        </div>

        {!pacientes ? (
          <Cargando texto="Cargando pacientes…" />
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={<Users size={20} />}
            titulo={pacientes.length === 0 ? "Todavía no hay pacientes" : "Sin resultados"}
            descripcion={pacientes.length === 0 ? "Registra tu primer paciente para empezar." : "Prueba con otro nombre o filtro."}
          />
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className={claseTabla.tabla}>
              <thead>
                <tr className={claseTabla.encabezado}>
                  <th className={claseTabla.celdaEncabezado}>Paciente</th>
                  <th className={claseTabla.celdaEncabezado}>IMC</th>
                  <th className={claseTabla.celdaEncabezado}>Sedentarismo</th>
                  <th className={claseTabla.celdaEncabezado}>Antecedentes</th>
                  <th className={claseTabla.celdaEncabezado} />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/pacientes/${p.id}`)} className={`${claseTabla.fila} cursor-pointer`}>
                    <td className={claseTabla.celda}>
                      <div className="flex items-center gap-3">
                        <Avatar nombre={p.nombre} tamano={34} />
                        <div>
                          <p className="font-medium text-white">{p.nombre}</p>
                          <p className="text-xs text-hud-tenue">{p.edad} años</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${claseTabla.celda} font-mono text-hud-texto`}>{p.imc}</td>
                    <td className={claseTabla.celda}><SedentarismoBadge nivel={p.sedentarismo} /></td>
                    <td className={`${claseTabla.celda} text-hud-texto`}>
                      {p.antecedente_familiar == null ? <span className="text-hud-tenue">Sin dato</span> : p.antecedente_familiar ? "Sí" : "No"}
                    </td>
                    <td className={`${claseTabla.celda} text-right`} onClick={(e) => e.stopPropagation()}>
                      <BotonEnlace to={`/simulador?id=${p.id}`} variante="secundario" tamano="sm" icono={<FlaskConical size={13} />}>
                        Simular
                      </BotonEnlace>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Shell>
  );
}
