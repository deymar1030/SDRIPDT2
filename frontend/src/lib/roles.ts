import type { Rol, Usuario } from "../types";

export const ROL_ETIQUETA: Record<Rol, string> = {
  admin: "Administrador/a",
  medico: "Médico/a",
};

/** Pantalla de inicio de cada rol: el admin gestiona cuentas (no ve pacientes); el médico trabaja con sus pacientes. */
export function inicioPorRol(usuario: Pick<Usuario, "rol"> | null | undefined): string {
  return usuario?.rol === "admin" ? "/usuarios" : "/dashboard";
}
