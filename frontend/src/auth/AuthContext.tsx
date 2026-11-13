import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "../api/client";
import type { Usuario } from "../types";

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (correo: string, password: string) => Promise<Usuario>;
  cerrarSesion: () => void;
  actualizarUsuario: (u: Usuario) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setCargando(false);
      return;
    }
    api
      .yo()
      .then(setUsuario)
      .catch(() => setToken(null))
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = useCallback(async (correo: string, password: string) => {
    const { access_token, usuario } = await api.login(correo, password);
    setToken(access_token);
    setUsuario(usuario);
    return usuario;
  }, []);

  const cerrarSesion = useCallback(() => {
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion, actualizarUsuario: setUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
