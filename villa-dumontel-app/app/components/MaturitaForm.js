"use client";

import { useState } from "react";
import { STATI, STATI_INFO, statoMaturita, dataStato } from "../../lib/cantina";
import SelettoreNumero from "./SelettoreNumero";

const CAMPI = ["anni_giovane", "anni_pronto", "anni_maturo", "anni_collezione"];
const iso = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

// Imposta lo stato di maturita' del vino all'ingresso in cantina:
// scorrevole per lo stato attuale + anni (da oggi) per raggiungere gli stati successivi.
export default function MaturitaForm({ vino, onSalva, onAnnulla, etichettaSalva = "Salva maturità" }) {
  const oggi = new Date();
  const statoIniziale = statoMaturita(vino, oggi);
  const [idx, setIdx] = useState(statoIniziale ? STATI.indexOf(statoIniziale) : 0);
  // anni da oggi per ogni stato successivo (indice 1..4)
  const [anni, setAnni] = useState(() => {
    const out = {};
    STATI.forEach((s, i) => {
      if (i === 0) return;
      const d = vino ? dataStato(vino, s) : null;
      if (d) {
        const a = Math.max(0, (d - oggi) / 86400000 / 365.25);
        out[i] = a === 0 ? "" : String(Math.round(a * 2) / 2 || 0.5);
      } else out[i] = "";
    });
    return out;
  });
  const [errore, setErrore] = useState(null);

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    const valori = [];
    for (let i = 1; i <= 4; i++) {
      if (i <= idx) valori.push(0);
      else {
        const x = parseFloat(anni[i]);
        if (!(x > 0)) return setErrore("Indica tra quanti anni il vino diventa \"" + STATI_INFO[STATI[i]].it + "\".");
        valori.push(x);
      }
    }
    for (let i = 1; i < 4; i++) {
      if (valori[i] < valori[i - 1]) return setErrore("Gli anni devono crescere da uno stato al successivo.");
    }
    const campi = { maturita_ingresso: iso(oggi) };
    CAMPI.forEach((c, i) => (campi[c] = valori[i]));
    campi.stato_maturita = STATI[idx];
    const err = await onSalva(campi);
    if (err) setErrore(err);
  }

  const info = STATI_INFO[STATI[idx]];
  return (
    <form onSubmit={salva}>
      <p style={{ margin: "0.4rem 0" }}>
        <strong>Stato attuale:</strong>{" "}
        <span style={{ background: info.colore, color: info.fg, borderRadius: 999, padding: "0.1rem 0.7rem", fontWeight: 600 }}>
          {info.it}
        </span>
      </p>
      <input
        type="range"
        min="0"
        max="4"
        step="1"
        value={idx}
        onChange={(e) => setIdx(parseInt(e.target.value, 10))}
        aria-label="Stato di maturità"
        style={{ width: "100%", accentColor: info.colore }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72em", color: "#6b6b60", marginBottom: "0.6rem" }}>
        {STATI.map((s) => (
          <span key={s}>{STATI_INFO[s].it}</span>
        ))}
      </div>
      {STATI.map((s, i) =>
        i > idx ? (
          <label key={s}>
            Diventa «{STATI_INFO[s].it}» tra (anni da oggi)
            <SelettoreNumero
              value={anni[i]}
              onChange={(e) => setAnni((p) => ({ ...p, [i]: e.target.value }))}
              min={0.5}
              max={60}
              passo={0.5}
              required
              vuoto="— scegli —"
              suffisso=" anni"
            />
          </label>
        ) : null
      )}
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
      <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn">
          {etichettaSalva}
        </button>
        {onAnnulla && (
          <button type="button" className="btn btn-light" onClick={onAnnulla}>
            Salta per ora
          </button>
        )}
      </p>
    </form>
  );
}
