"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { dmy } from "../../lib/i18n";
import { Matita, Cestino } from "./IconeAzione";

// Periodi di affitto per famiglia / appartamento (solo admin)
export default function AffittiBox({ famiglie, onCambiato }) {
  const [affitti, setAffitti] = useState([]);
  const [modifica, setModifica] = useState(null); // riga in modifica oppure {} per nuova
  const [errore, setErrore] = useState(null);

  async function carica() {
    const { data } = await supabase.from("affitti").select("*").order("dal", { ascending: false });
    setAffitti(data || []);
    onCambiato && onCambiato(data || []);
  }
  useEffect(() => {
    carica();
  }, []);

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const riga = {
      famiglia_id: Number(f.famiglia_id.value),
      dal: f.dal.value,
      al: f.al.value || null,
      note: f.note.value.trim() || null,
    };
    if (riga.al && riga.al < riga.dal) return setErrore("La data di fine non puo' essere prima dell'inizio.");
    const { error } = modifica.id
      ? await supabase.from("affitti").update(riga).eq("id", modifica.id)
      : await supabase.from("affitti").insert(riga);
    if (error) return setErrore("Errore: " + error.message);
    setModifica(null);
    await carica();
  }

  async function elimina(a) {
    if (!window.confirm("Eliminare questo periodo di affitto?")) return;
    await supabase.from("affitti").delete().eq("id", a.id);
    await carica();
  }

  const nome = (id) => (famiglie.find((f) => f.id === id) || {}).nome || "?";

  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ marginTop: 0 }}>Periodo di affitto</h2>
      {famiglie.map((f) => {
        const mie = affitti.filter((a) => a.famiglia_id === f.id);
        return (
          <div key={f.id} style={{ marginBottom: "0.75rem" }}>
            <strong>{f.nome}</strong>
            {mie.length === 0 && <p className="muted" style={{ margin: "0.15rem 0" }}>Nessun periodo indicato.</p>}
            {mie.map((a) => (
              <p key={a.id} className="descrizione" style={{ margin: "0.15rem 0" }}>
                dal {dmy(a.dal)} {a.al ? "al " + dmy(a.al) : "(senza scadenza)"}
                {a.note ? ` — ${a.note}` : ""}
                <span style={{ marginLeft: "0.4rem", whiteSpace: "nowrap" }}>
                  <Matita onClick={() => setModifica(a)} />
                  <Cestino onClick={() => elimina(a)} />
                </span>
              </p>
            ))}
          </div>
        );
      })}

      {modifica ? (
        <form onSubmit={salva} style={{ marginTop: "0.75rem" }}>
          <label>
            Famiglia / appartamento
            <select name="famiglia_id" defaultValue={modifica.famiglia_id || (famiglie[0] ? famiglie[0].id : "")}>
              {famiglie.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dal
            <input type="date" name="dal" defaultValue={modifica.dal || ""} required />
          </label>
          <label>
            Al (lascia vuoto se senza scadenza)
            <input type="date" name="al" defaultValue={modifica.al || ""} />
          </label>
          <label>
            Note
            <input name="note" defaultValue={modifica.note || ""} />
          </label>
          {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
          <button type="submit" className="btn">
            Salva
          </button>{" "}
          <button type="button" className="btn btn-light" onClick={() => setModifica(null)}>
            Annulla
          </button>
        </form>
      ) : (
        <button type="button" className="btn btn-light" onClick={() => setModifica({})}>
          Aggiungi un periodo di affitto
        </button>
      )}
    </div>
  );
}
