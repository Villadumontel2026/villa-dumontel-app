"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";

const oggi = () => new Date().toISOString().slice(0, 10);

function Campi({ n = {} }) {
  return (
    <>
      <label>
        Titolo (italiano)
        <input type="text" name="titolo_it" defaultValue={n.titolo_it || ""} required />
      </label>
      <label>
        Titolo (inglese)
        <input type="text" name="titolo_en" defaultValue={n.titolo_en || ""} />
      </label>
      <label>
        Testo (italiano)
        <textarea name="testo_it" defaultValue={n.testo_it || ""}></textarea>
      </label>
      <label>
        Testo (inglese)
        <textarea name="testo_en" defaultValue={n.testo_en || ""}></textarea>
      </label>
      <label>
        Link (facoltativo, es. /info/ristoranti o https://...)
        <input type="text" name="link" defaultValue={n.link || ""} />
      </label>
      <label>
        Data
        <input type="date" name="data_pubblicazione" defaultValue={n.data_pubblicazione || oggi()} />
      </label>
    </>
  );
}

const leggi = (f) => {
  const v = (x) => (f[x].value ? f[x].value : null);
  return {
    titolo_it: f.titolo_it.value,
    titolo_en: v("titolo_en"),
    testo_it: v("testo_it"),
    testo_en: v("testo_en"),
    link: v("link"),
    data_pubblicazione: v("data_pubblicazione") || oggi(),
  };
};

// Editor delle novità, visibile solo all'admin in cima alla pagina Info. Chiudibile.
export default function NovitaAdminBox() {
  const { ruolo } = useApp();
  const [novita, setNovita] = useState([]);
  const [errore, setErrore] = useState(null);

  async function carica() {
    const { data } = await supabase
      .from("novita")
      .select("*")
      .order("data_pubblicazione", { ascending: false });
    setNovita(data || []);
  }

  useEffect(() => {
    if (ruolo === "admin") carica();
  }, [ruolo]);

  if (ruolo !== "admin") return null;

  const gestisci = async (promessa) => {
    const { error } = await promessa;
    if (error) return setErrore("Errore: " + error.message);
    setErrore(null);
    await carica();
  };

  async function aggiungi(e) {
    e.preventDefault();
    const f = e.target;
    const { error } = await supabase.from("novita").insert(leggi(f));
    if (error) return setErrore("Errore: " + error.message);
    f.reset();
    setErrore(null);
    await carica();
  }

  return (
    <details className="card" style={{ marginBottom: "1.5rem", borderLeft: "4px solid var(--color-accent)" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        Novità per gli ospiti (solo admin){" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          ({novita.filter((n) => n.attiva).length} attive)
        </span>
      </summary>
      <p className="muted" style={{ marginTop: "0.75rem" }}>
        Le novità attive compaiono nella home degli ospiti e nella pagina Novità, nella loro lingua. Se
        manca il testo inglese viene mostrato l&apos;italiano.
      </p>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      <details style={{ margin: "0.75rem 0" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Nuova novità</summary>
        <form onSubmit={aggiungi} style={{ marginTop: "0.75rem" }}>
          <Campi />
          <button type="submit" className="btn">
            Pubblica
          </button>
        </form>
      </details>

      {novita.length === 0 && <p className="muted">Nessuna novità.</p>}
      {novita.map((n) => (
        <div key={n.id} className="richiesta-item" style={{ opacity: n.attiva ? 1 : 0.55 }}>
          <strong>{n.titolo_it}</strong>
          <p className="descrizione">
            {n.data_pubblicazione}
            {n.attiva ? "" : " — nascosta"}
          </p>
          <details style={{ margin: "0.5rem 0" }}>
            <summary style={{ cursor: "pointer" }}>Modifica</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                gestisci(supabase.from("novita").update(leggi(e.target)).eq("id", n.id));
              }}
              style={{ marginTop: "0.5rem" }}
            >
              <Campi n={n} />
              <button type="submit" className="btn">
                Salva
              </button>
            </form>
          </details>
          <div className="stato-actions">
            <button type="button" onClick={() => gestisci(supabase.from("novita").update({ attiva: !n.attiva }).eq("id", n.id))}>
              {n.attiva ? "Nascondi" : "Mostra"}
            </button>{" "}
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Eliminare questa novità?")) gestisci(supabase.from("novita").delete().eq("id", n.id));
              }}
            >
              Elimina
            </button>
          </div>
        </div>
      ))}
    </details>
  );
}
