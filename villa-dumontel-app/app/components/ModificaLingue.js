"use client";

import { LINGUE_CONTENUTI, NOMI_LINGUE } from "../../lib/lingua";

// Contenitore dei moduli con testi tradotti (le tre versioni compaiono sempre tutte).
export default function ModificaLingue({ children }) {
  return <>{children}</>;
}

// Un campo con tre versioni (it, en, fr), tutte visibili e salvate insieme col modulo.
// nomi: nomi dei campi nel modulo, es. { it: "titolo_it", en: "titolo_en", fr: "titolo_fr" }
export function CampoLingue({ etichetta, nomi, valori = {}, area = false, righe = 3, richiesto = false }) {
  return (
    <div style={{ margin: "0 0 0.4rem" }}>
      <p style={{ margin: "0 0 0.3rem", fontWeight: 600 }}>{etichetta}</p>
      {LINGUE_CONTENUTI.map((l) => {
        const comune = {
          name: nomi[l],
          defaultValue: valori[l] || "",
          required: richiesto && l === "it",
          style: { marginBottom: "0.5rem" },
        };
        return (
          <label key={l} style={{ display: "flex", gap: "0.6rem", alignItems: area ? "flex-start" : "center", fontWeight: 400, marginBottom: 0 }}>
            <span className="muted" style={{ width: "5.2rem", flexShrink: 0, fontSize: "0.85em", paddingTop: area ? "0.55rem" : 0 }} title={NOMI_LINGUE[l]}>
              {NOMI_LINGUE[l]}
            </span>
            {area ? <textarea rows={righe} {...comune}></textarea> : <input type="text" {...comune} />}
          </label>
        );
      })}
    </div>
  );
}

// Pulsanti IT / EN / FR per vedere un elenco in una sola lingua
export function VistaLingua({ lingua, onChange }) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", margin: "0 0 1rem" }}>
      <span className="muted" style={{ fontSize: "0.85em" }}>Vedi l&apos;elenco in:</span>
      {LINGUE_CONTENUTI.map((l) => (
        <button
          key={l}
          type="button"
          className={"vd-chip" + (lingua === l ? " vd-chip-on" : "")}
          style={{ padding: "0.25rem 0.8rem" }}
          onClick={() => onChange(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
