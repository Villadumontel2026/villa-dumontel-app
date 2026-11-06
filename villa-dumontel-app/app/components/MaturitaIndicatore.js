"use client";

import { STATI, STATI_INFO, dataStato } from "../../lib/cantina";

// Barra a 5 tappe: Immaturo - Giovane - Pronto - Maturo - Da collezione. La tappa attuale e' evidenziata.
export default function MaturitaIndicatore({ vino, stato, lang = "it", compatto = false }) {
  const idx = STATI.indexOf(stato);
  const fmt = (d) => (d ? d.toLocaleDateString(lang === "en" ? "en-GB" : "it-IT", { month: "short", year: "numeric" }) : "");
  if (idx < 0) {
    return compatto ? null : <p className="muted" style={{ margin: "0.2rem 0" }}>{lang === "en" ? "Maturity not set" : "Maturità non impostata"}</p>;
  }
  const info = STATI_INFO[stato];
  return (
    <div style={{ margin: "0.3rem 0" }}>
      <div style={{ display: "flex", gap: 3 }}>
        {STATI.map((s, i) => (
          <div
            key={s}
            title={STATI_INFO[s][lang === "en" ? "en" : "it"]}
            style={{
              flex: 1,
              height: compatto ? 8 : 12,
              borderRadius: 6,
              background: STATI_INFO[s].colore,
              opacity: i === idx ? 1 : 0.28,
              outline: i === idx ? "2px solid #26261f" : "none",
              outlineOffset: 1,
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 4, fontSize: compatto ? "0.8em" : "0.92em" }}>
        <span
          style={{ background: info.colore, color: info.fg, borderRadius: 999, padding: "0.1rem 0.6rem", fontWeight: 600 }}
        >
          {info[lang === "en" ? "en" : "it"]}
        </span>
        {!compatto && vino && idx < 4 && (
          <span className="muted" style={{ marginLeft: "0.5rem" }}>
            {lang === "en" ? "next: " : "prossimo: "}
            {STATI_INFO[STATI[idx + 1]][lang === "en" ? "en" : "it"]} {fmt(dataStato(vino, STATI[idx + 1]))}
          </span>
        )}
      </div>
    </div>
  );
}
