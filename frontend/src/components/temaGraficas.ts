import { useTema } from "../tema/TemaContext";

const PALETA_CLARA = ["#1f5f8b", "#c8741a", "#3a8a68", "#8a4f8f"];
const PALETA_OSCURA = ["#6fb1dd", "#e8a04e", "#6cc09a", "#c196c6"];

export function usePaleta() {
  return useTema().tema === "dark" ? PALETA_OSCURA : PALETA_CLARA;
}

export function useEjes() {
  const oscuro = useTema().tema === "dark";
  return oscuro
    ? { rejilla: "#242c34", linea: "#46525e", texto: "#a3abb4", tinta: "#e6e9ed", fondo: "#151a20", borde: "#29313a", alerta: "#e5776f", aviso: "#e2b865" }
    : { rejilla: "#e3e0d8", linea: "#b9b5a9", texto: "#4a525b", tinta: "#1d2127", fondo: "#ffffff", borde: "#d9d6cd", alerta: "#b42318", aviso: "#b7791f" };
}
