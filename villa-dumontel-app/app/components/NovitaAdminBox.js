"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";
import PopupScheda from "./PopupEvento";
import { Matita, Cestino, Piu } from "./IconeAzione";
import ModificaLingue, { CampoLingue } from "./ModificaLingue";

const oggi = () => new Date().toISOString().slice(0, 10);

function Campi({ n = {} }) {
  return (
    <>
      <ModificaLingue>
        <CampoLingue etichetta="Titolo" nomi={{ it: "titolo_it", en: "titolo_en", fr: "titolo_fr" }} valori={{ it: n.titolo_it, en: n.titolo_en, fr: n.titolo_fr }} richiesto />
        <CampoLingue etichetta="Testo" area nomi={{ it: "testo_it", en: "testo_en", fr: "testo_fr" }} valori={{ it: n.testo_it, en: n.testo_en, fr: n.testo_fr }} />
      </ModificaLingue>
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
    titolo_fr: v("titolo_fr"),
    testo_fr: v("testo_fr"),
    link: v("link"),
    data_pubblicazione: v("data_pubblicazione") || oggi(),
  };
};

// Editor delle novità, visibile solo all'admin in cima alla pagina Info. Chiudibile.
export default function NovitaAdminBox() {
  const { ruolo } = useApp();
  const [novita, setNovita] = useState([]);
  const [errore, setErrore] = useState(null);
  const [nuovaAperta, setNuovaAperta] = useState(false);
  const [editId, setEditId] = useState(null);

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
    setNuovaAperta(false);
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

      <p style={{ margin: "0.75rem 0" }}>
        <Piu onClick={() => setNuovaAperta(true)} titolo="Nuova novità" />
      </p>
      {nuovaAperta && (
        <PopupScheda titolo="Nuova novità" onChiudi={() => setNuovaAperta(false)} larga>
          <form onSubmit={aggiungi} style={{ marginTop: "0.5rem" }}>
            <Campi />
            <button type="submit" className="btn">
              Pubblica
            </button>
          </form>
        </PopupScheda>
      )}

      {novita.length === 0 && <p className="muted">Nessuna novità.</p>}
      {novita.map((n) => (
        <div key={n.id} className="richiesta-item" style={{ opacity: n.attiva ? 1 : 0.55 }}>
          <strong>{n.titolo_it}</strong>
          <p className="descrizione">
            {n.data_pubblicazione}
            {n.attiva ? "" : " — nascosta"}
          </p>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            <Matita onClick={() => setEditId(n.id)} titolo="Modifica" />
            <button type="button" className="btn btn-light" style={{ padding: "0.2rem 0.7rem" }} onClick={() => gestisci(supabase.from("novita").update({ attiva: !n.attiva }).eq("id", n.id))}>
              {n.attiva ? "Nascondi" : "Mostra"}
            </button>
            <Cestino
              onClick={() => {
                if (window.confirm("Eliminare questa novità?")) gestisci(supabase.from("novita").delete().eq("id", n.id));
              }}
            />
          </div>
        </div>
      ))}
      {editId && (() => {
        const n = novita.find((x) => x.id === editId);
        if (!n) return null;
        return (
          <PopupScheda titolo={n.titolo_it} sottotitolo="Modifica" onChiudi={() => setEditId(null)} larga>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await gestisci(supabase.from("novita").update(leggi(e.target)).eq("id", n.id));
                setEditId(null);
              }}
              style={{ marginTop: "0.5rem" }}
            >
              <Campi n={n} />
              <button type="submit" className="btn">
                Salva
              </button>
            </form>
          </PopupScheda>
        );
      })()}
    </details>
  );
}
