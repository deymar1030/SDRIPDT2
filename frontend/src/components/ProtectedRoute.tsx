import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { inicioPorRol } from "../lib/roles";
import type { Rol } from "../types";
import { Cargando } from "./ui";

/** Exige sesión y, si se indican `roles`, que el usuario tenga uno de ellos; si no, lo manda a su pantalla de inicio. */
export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Rol[] }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Cargando texto="Verificando sesión…" />
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={inicioPorRol(usuario)} replace />;
  return <>{children}</>;
}
