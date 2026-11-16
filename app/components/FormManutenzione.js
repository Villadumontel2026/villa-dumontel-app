"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { salvaFoto } from "../../lib/foto";
import { useApp } from "./AppProvider";
import ChipZone from "./ChipZone";
import FotoInput from "./FotoInput";

// Segnalazione di una manutenzione: alloggio, zone, titolo, note e foto.
// alloggi: [{id, nome, famiglia_id}], zone: tutte le zone [{famiglia_id, nome}]
export default function FormManutenzione({ alloggi, zone = [], onFatto }) {
  const { lang } = useApp();
  const en = lang === "en";
  const [alloggioId, setAlloggioId] = useState(alloggi && alloggi[0] ? String(alloggi[0].id) : "");
  const [sel, setSel] = useState([]);
  const [foto, setFoto] = useState([]);
  const [errore, setErrore] = useState(null);
  const [fatto, setFatto] = useState(false);
  const [occupato, setOccupato] = useState(false);

  const alloggio = (alloggi || []).find((a) => String(a.id) === String(alloggioId));
  const zoneFam = zone.filter((z) => alloggio && z.famiglia_id === alloggio.famiglia_id);

  async function invia(e) {
    e.preventDefault();
    setErrore(null);
    setFatto(false);
    if (!alloggio) return setErrore(en ? "Choose the apartment." : "Scegli l'alloggio.");
    const f = e.target;
    const altra = (f.zona_altra.value || "").trim();
    const elenco = [...sel, ...(altra ? [altra] : [])];
    setOccupato(true);
    const { data, error } = await supabase
      .from("manutenzioni")
      .insert({
        famiglia_id: alloggio.famiglia_id,
        alloggio_id: alloggio.id,
        titolo: f.titolo.value.trim(),
        zone: elenco.length ? elenco.join(", ") : null,
        note: f.note.value.trim() || null,
      })
      .select("id")
      .single();
    if (error) {
      setOccupato(false);
      return setErrore((en ? "Error: " : "Errore: ") + error.message);
    }
    const errFoto = await salvaFoto(foto, { famiglia_id: alloggio.famiglia_id, manutenzione_id: data.id });
    setOccupato(false);
    if (errFoto) setErrore((en ? "Request sent, but a photo failed: " : "Richiesta inviata, ma una foto non è stata caricata: ") + errFoto);
    f.reset();
    setSel([]);
    setFoto([]);
    setFatto(true);
    if (onFatto) onFatto();
  }

  return (
    <form onSubmit={invia}>
      {fatto && (
        <p className="card" style={{ background: "#eef7ef" }}>
          {en ? "Request sent. " : "Segnalazione inviata. "}
          <a href="/manutenzioni" className="btn btn-light">
            {en ? "See maintenance requests" : "Vedi le manutenzioni"}
          </a>
        </p>
      )}
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
      {alloggi && alloggi.length > 1 && (
        <label>
          {en ? "Apartment" : "Alloggio"}
          <select value={alloggioId} onChange={(e) => { setAlloggioId(e.target.value); setSel([]); }}>
            {alloggi.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>{en ? "Where?" : "Dove?"}</label>
      {zoneFam.length > 0 && <ChipZone zone={zoneFam} selezionate={sel} onChange={setSel} />}
      <label>
        {en ? "Other place (optional)" : "Altro luogo (facoltativo)"}
        <input type="text" name="zona_altra" placeholder={en ? "e.g. terrace, cellar" : "es. terrazzo, cantina"} />
      </label>
      <label>
        {en ? "What is the problem?" : "Qual è il problema?"}
        <input type="text" name="titolo" required placeholder={en ? "e.g. leaking tap" : "es. rubinetto che perde"} />
      </label>
      <label>
        {en ? "Notes" : "Note"}
        <textarea name="note"></textarea>
      </label>
      <FotoInput files={foto} onChange={setFoto} />
      <button type="submit" className="btn" disabled={occupato}>
        {occupato ? (en ? "Sending…" : "Invio…") : en ? "Send request" : "Invia segnalazione"}
      </button>
    </form>
  );
}
