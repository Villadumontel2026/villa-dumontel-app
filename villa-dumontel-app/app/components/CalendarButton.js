"use client";

import { useApp } from "./AppProvider";
import { costruisciEvento, calendarioIcs, linkGoogle } from "../../lib/calendario";

// Aggiunge una singola richiesta al calendario (file .ics o link Google).
// Per avere aggiornamenti automatici vedi la pagina "Calendario" (abbonamento).
export default function CalendarButton({ richiesta }) {
  const { t, lang } = useApp();
  if (!richiesta || !richiesta.data) return null;
  const ev = costruisciEvento(richiesta, { lang });

  function scarica() {
    const blob = new Blob([calendarioIcs([ev])], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "villa-dumontel-" + richiesta.id + ".ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <button type="button" onClick={scarica}>
        {t("cal.aggiungi")}
      </button>
      <a href={linkGoogle(ev)} target="_blank" rel="noreferrer">
        <button type="button">{t("cal.google2")}</button>
      </a>
    </span>
  );
}
