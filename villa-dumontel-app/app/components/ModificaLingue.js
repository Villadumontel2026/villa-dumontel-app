"use client";

import { createContext, useContext, useState } from "react";
import { LINGUE_CONTENUTI, NOMI_LINGUE } from "../../lib/lingua";

const Ctx = createContext("it");

// Contenitore per i moduli con testi tradotti: una sola barra di pulsanti IT / EN / FR in alto.
// I campi si scrivono in italiano (lingua base); con i pulsanti si passa a inglese e francese.
export default function ModificaLingue({ children }) {
  const [lingua, setLingua] = useState("it");
  return (
    <Ctx.Provider value={lingua}>
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", margin: "0 0 0.9rem", flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: "0.85em" }}>Lingua del testo:</span>
        {LINGUE_CONTENUTI.map((l) => (
          <button
            key={l}
            type="button"
            className={"vd-chip" + (lingua === l ? " vd-chip-on" : "")}
            style={{ padding: "0.25rem 0.8rem" }}
            title={NOMI_LINGUE[l]}
            onClick={() => setLingua(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      {children}
    </Ctx.Provider>
  );
}

// Un campo con tre versioni (it, en, fr): se ne vede una alla volta, tutte vengono salvate col modulo.
// nomi: nomi dei campi nel modulo, es. { it: "titolo_it", en: "titolo_en", fr: "titolo_fr" }
export function CampoLingue({ etichetta, nomi, valori = {}, area = false, righe = 3, richiesto = false }) {
  const attiva = useContext(Ctx);
  return (
    <>
      {LINGUE_CONTENUTI.map((l) => {
        const comune = {
          name: nomi[l],
          defaultValue: valori[l] || "",
          placeholder: l !== "it" && valori.it ? valori.it : undefined,
          required: richiesto && l === "it" && attiva === "it",
        };
        return (
          <label key={l} style={{ display: attiva === l ? "block" : "none" }}>
            {etichetta} <span className="muted" style={{ fontWeight: 400 }}>({NOMI_LINGUE[l]})</span>
            {area ? <textarea rows={righe} {...comune}></textarea> : <input type="text" {...comune} />}
          </label>
        );
      })}
    </>
  );
}
