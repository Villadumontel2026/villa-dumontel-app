"use client";

import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";

const HOME_PER_RUOLO = {
  ospite: "/ospite",
  admin: "/richieste",
  collaboratore: "/pulizie/collaboratore",
};

// Pulsante "Home" colorato in cima a tutte le pagine (tranne le home stesse e il login).
export default function HomeBar() {
  const { ruolo, pronto, t } = useApp();
  const percorso = usePathname() || "/";
  if (!pronto) return null;
  const home = HOME_PER_RUOLO[ruolo] || "/";
  if (percorso === home || percorso === "/" || percorso === "/login" || percorso === "/dopo-login") {
    return null;
  }
  return (
    <p style={{ margin: "0 0 1rem" }}>
      <a href={home} className="btn" style={{ padding: "0.45rem 1rem" }}>
        &larr; {t("nav.home")}
      </a>
    </p>
  );
}
