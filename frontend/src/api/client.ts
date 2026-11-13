import type {
  DatosEscenario,
  Escenario,
  NuevoPaciente,
  Paciente,
  PacienteRiesgo,
  SimulateResponse,
  SimulationRunSummary,
  Usuario,
} from "../types";

const BASE = "/api";

let token: string | null = localStorage.getItem("token");

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export function getToken() {
  return token;
}

const NOMBRES_CAMPO: Record<string, string> = {
  nombre: "El nombre",
  edad: "La edad",
  sexo: "El sexo",
  imc: "El IMC",
  peso: "El peso",
  talla: "La talla",
  glucosa: "La glucosa",
  insulina: "La insulina",
  hba1c: "La HbA1c",
  correo: "El correo",
  password: "La contraseña",
  nueva: "La nueva contraseña",
};

interface ErrorValidacion {
  type?: string;
  loc?: unknown[];
  msg?: string;
  ctx?: { ge?: number; le?: number; gt?: number; lt?: number; min_length?: number };
}

/** FastAPI devuelve `detail` como texto, o como lista de objetos cuando falla la
 *  validación (422): se convierte a una frase legible en español. */
function formatearDetalle(detalle: unknown, porDefecto: string): string {
  if (typeof detalle === "string") return detalle;
  if (!Array.isArray(detalle)) return porDefecto;

  const frases = detalle.map((e: ErrorValidacion | string) => {
    if (typeof e === "string") return e;
    const campo = Array.isArray(e.loc) ? String(e.loc[e.loc.length - 1]) : "";
    const sujeto = NOMBRES_CAMPO[campo] ?? (campo ? `El campo «${campo}»` : "El dato");
    const c = e.ctx ?? {};
    switch (e.type) {
      case "greater_than_equal": return `${sujeto} debe ser al menos ${c.ge}`;
      case "greater_than": return `${sujeto} debe ser mayor que ${c.gt}`;
      case "less_than_equal": return `${sujeto} no puede ser mayor que ${c.le}`;
      case "less_than": return `${sujeto} debe ser menor que ${c.lt}`;
      case "missing": return `${sujeto} es obligatorio`;
      case "string_too_short": return `${sujeto} es demasiado corto`;
      case "value_error": return `${sujeto} no es válido`;
      default: return `${sujeto} no es válido`;
    }
  });
  return [...new Set(frases)].join(". ") + ".";
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opciones.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opciones.body && !(opciones.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  const resp = await fetch(`${BASE}${ruta}`, { ...opciones, headers });
  if (!resp.ok) {
    let detalle = `Error ${resp.status}`;
    try {
      const data = await resp.json();
      detalle = formatearDetalle(data.detail, detalle);
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(detalle);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

export const api = {
  async login(correo: string, password: string) {
    const form = new URLSearchParams();
    form.set("username", correo);
    form.set("password", password);
    return peticion<{ access_token: string; usuario: Usuario }>("/auth/login", {
      method: "POST",
      body: form,
    });
  },

  async registrar(nombre: string, correo: string, password: string, rol: string) {
    return peticion<{ access_token: string; usuario: Usuario }>("/auth/registro", {
      method: "POST",
      body: JSON.stringify({ nombre, correo, password, rol }),
    });
  },

  async yo() {
    return peticion<Usuario>("/auth/yo");
  },

  async listarPacientes() {
    return peticion<Paciente[]>("/pacientes");
  },

  async listarPacientesRiesgo() {
    return peticion<PacienteRiesgo[]>("/pacientes/riesgo");
  },

  async obtenerPaciente(id: number) {
    return peticion<Paciente>(`/pacientes/${id}`);
  },

  async crearPaciente(datos: NuevoPaciente) {
    return peticion<Paciente>("/pacientes", { method: "POST", body: JSON.stringify(datos) });
  },

  async listarEscenarios(pacienteId: number) {
    return peticion<Escenario[]>(`/pacientes/${pacienteId}/escenarios`);
  },

  async crearEscenario(pacienteId: number, datos: DatosEscenario) {
    return peticion<Escenario>(`/pacientes/${pacienteId}/escenarios`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  },

  async actualizarEscenario(pacienteId: number, escenarioId: number, datos: DatosEscenario) {
    return peticion<Escenario>(`/pacientes/${pacienteId}/escenarios/${escenarioId}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    });
  },

  async eliminarEscenario(pacienteId: number, escenarioId: number) {
    return peticion<void>(`/pacientes/${pacienteId}/escenarios/${escenarioId}`, { method: "DELETE" });
  },

  async simular(pacienteId: number, horizonte_anios: number, trayectorias: number, escenario_ids?: number[]) {
    return peticion<SimulateResponse>(`/pacientes/${pacienteId}/simular`, {
      method: "POST",
      body: JSON.stringify({ horizonte_anios, trayectorias, escenario_ids }),
    });
  },

  async listarSimulaciones(pacienteId: number) {
    return peticion<SimulationRunSummary[]>(`/pacientes/${pacienteId}/simulaciones`);
  },

  async obtenerSimulacion(pacienteId: number, runId: number) {
    return peticion<SimulateResponse>(`/pacientes/${pacienteId}/simulaciones/${runId}`);
  },

  async actualizarPerfil(nombre: string, correo: string) {
    return peticion<Usuario>("/auth/perfil", { method: "PATCH", body: JSON.stringify({ nombre, correo }) });
  },

  async cambiarPassword(actual: string, nueva: string) {
    return peticion<void>("/auth/password", { method: "POST", body: JSON.stringify({ actual, nueva }) });
  },
};
