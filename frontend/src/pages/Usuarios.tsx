import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Power, ShieldCheck, Stethoscope, UserPlus, X } from "lucide-react";
import { Shell } from "../components/Shell";
import { Aviso, Avatar, Boton, Campo, Cargando, Entrada, Panel, Selector, claseTabla } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { ROL_ETIQUETA } from "../lib/roles";
import type { Rol, Usuario } from "../types";

type Formulario = { id: number | null; nombre: string; correo: string; rol: Rol; password: string };
const VACIO: Formulario = { id: null, nombre: "", correo: "", rol: "medico", password: "" };

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function InsigniaRol({ rol }: { rol: Rol }) {
  const Icono = rol === "admin" ? ShieldCheck : Stethoscope;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hud-borde-fuerte bg-hud-acento/10 px-2.5 py-0.5 text-xs font-medium text-sky-100">
      <Icono size={12} className="text-hud-acento" /> {ROL_ETIQUETA[rol]}
    </span>
  );
}

export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    api.listarUsuarios().then(setUsuarios).catch((e) => setError(e.message));
  }, []);
  useEffect(cargar, [cargar]);

  const editando = form?.id != null;
  const campo = (parcial: Partial<Formulario>) => setForm((f) => (f ? { ...f, ...parcial } : f));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setExito(null);
    setGuardando(true);
    try {
      if (form.id == null) {
        await api.crearUsuario({ nombre: form.nombre, correo: form.correo, password: form.password, rol: form.rol });
        setExito(`Cuenta creada para ${form.correo.trim().toLowerCase()}.`);
      } else {
        await api.actualizarUsuario(form.id, {
          nombre: form.nombre,
          correo: form.correo,
          rol: form.rol,
          ...(form.password ? { password: form.password } : {}),
        });
        setExito("Cuenta actualizada.");
      }
      setForm(null);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la cuenta");
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(u: Usuario) {
    setError(null);
    setExito(null);
    try {
      await api.actualizarUsuario(u.id, { activo: !u.activo });
      setExito(u.activo ? `Cuenta de ${u.correo} desactivada.` : `Cuenta de ${u.correo} reactivada.`);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado de la cuenta");
    }
  }

  return (
    <Shell titulo="Usuarios" subtitulo="Cuentas de acceso al sistema">
      <div className="space-y-5">
        <Panel esquinas>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-1.5 text-sm text-hud-suave">
              <p>
                <b className="text-white">No hay registro público:</b> las cuentas las crea el administrador. Hay dos roles.
              </p>
              <p><b className="text-white">Administrador/a</b> gestiona las cuentas; no tiene acceso a los datos de los pacientes.</p>
              <p><b className="text-white">Médico/a</b> registra y atiende a sus propios pacientes. Los pacientes no tienen cuenta: son fichas del médico.</p>
            </div>
            <Boton onClick={() => { setError(null); setExito(null); setForm({ ...VACIO }); }} icono={<UserPlus size={16} />}>
              Nueva cuenta
            </Boton>
          </div>
        </Panel>

        {exito && <Aviso tipo="exito">{exito}</Aviso>}
        {error && <Aviso tipo="error">{error}</Aviso>}

        {form && (
          <Panel titulo={editando ? "Editar cuenta" : "Nueva cuenta"}>
            <form onSubmit={guardar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre completo" htmlFor="u-nombre">
                <Entrada id="u-nombre" required value={form.nombre} onChange={(e) => campo({ nombre: e.target.value })} maxLength={120} autoFocus />
              </Campo>
              <Campo etiqueta="Correo" htmlFor="u-correo">
                <Entrada id="u-correo" required type="email" value={form.correo} onChange={(e) => campo({ correo: e.target.value })} />
              </Campo>
              <Campo
                etiqueta="Rol"
                htmlFor="u-rol"
                ayuda={form.id === yo?.id ? "No puedes cambiar tu propio rol." : undefined}
              >
                <Selector id="u-rol" value={form.rol} onChange={(e) => campo({ rol: e.target.value as Rol })} disabled={form.id === yo?.id}>
                  <option value="medico">{ROL_ETIQUETA.medico}</option>
                  <option value="admin">{ROL_ETIQUETA.admin}</option>
                </Selector>
              </Campo>
              <Campo
                etiqueta={editando ? "Nueva contraseña (opcional)" : "Contraseña inicial"}
                htmlFor="u-password"
                ayuda={editando ? "Déjala vacía para no cambiarla." : "Mínimo 6 caracteres. Compártela de forma segura y pídele a la persona que la cambie en su perfil."}
              >
                <Entrada
                  id="u-password"
                  type="text"
                  autoComplete="off"
                  required={!editando}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => campo({ password: e.target.value })}
                />
              </Campo>
              <div className="flex gap-2 sm:col-span-2">
                <Boton type="submit" cargando={guardando} icono={<Check size={16} />}>{editando ? "Guardar cambios" : "Crear cuenta"}</Boton>
                <Boton type="button" variante="fantasma" onClick={() => setForm(null)} icono={<X size={16} />}>Cancelar</Boton>
              </div>
            </form>
          </Panel>
        )}

        <Panel titulo="Cuentas">
          {!usuarios ? (
            <Cargando />
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className={claseTabla.tabla}>
                <thead>
                  <tr className={claseTabla.encabezado}>
                    <th className={claseTabla.celdaEncabezado}>Usuario</th>
                    <th className={claseTabla.celdaEncabezado}>Rol</th>
                    <th className={claseTabla.celdaEncabezado}>Estado</th>
                    <th className={claseTabla.celdaEncabezado}>Creada</th>
                    <th className={claseTabla.celdaEncabezado} />
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const esYo = u.id === yo?.id;
                    return (
                      <tr key={u.id} className={claseTabla.fila}>
                        <td className={claseTabla.celda}>
                          <div className="flex items-center gap-3">
                            <Avatar nombre={u.nombre} tamano={34} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">
                                {u.nombre} {esYo && <span className="ml-1 text-xs font-normal text-hud-tenue">(tú)</span>}
                              </p>
                              <p className="truncate text-xs text-hud-tenue">{u.correo}</p>
                            </div>
                          </div>
                        </td>
                        <td className={claseTabla.celda}><InsigniaRol rol={u.rol} /></td>
                        <td className={claseTabla.celda}>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.activo ? "text-emerald-400" : "text-hud-tenue"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.activo ? "bg-emerald-400" : "bg-hud-tenue"}`} />
                            {u.activo ? "Activa" : "Desactivada"}
                          </span>
                        </td>
                        <td className={`${claseTabla.celda} text-hud-suave`}>{formatearFecha(u.creado_en)}</td>
                        <td className={`${claseTabla.celda} text-right`}>
                          <div className="flex justify-end gap-2">
                            <Boton
                              variante="secundario"
                              tamano="sm"
                              onClick={() => { setError(null); setExito(null); setForm({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, password: "" }); }}
                              icono={<Pencil size={13} />}
                              aria-label={`Editar ${u.correo}`}
                            >
                              Editar
                            </Boton>
                            <Boton
                              variante={u.activo ? "peligro" : "secundario"}
                              tamano="sm"
                              onClick={() => alternarActivo(u)}
                              disabled={esYo}
                              title={esYo ? "No puedes desactivar tu propia cuenta" : undefined}
                              icono={<Power size={13} />}
                              aria-label={`${u.activo ? "Desactivar" : "Reactivar"} ${u.correo}`}
                            >
                              {u.activo ? "Desactivar" : "Reactivar"}
                            </Boton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
