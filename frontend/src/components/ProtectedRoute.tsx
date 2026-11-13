import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Cargando } from "./ui";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Cargando texto="Verificando sesión…" />
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
