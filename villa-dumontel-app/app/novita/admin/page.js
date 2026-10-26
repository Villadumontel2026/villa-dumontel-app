"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const CAT = { ristorante: "Ristoranti", attivita: "Attività", bar: "Bar", food_drink: "Food & Drink" };

export default function NovitaAdminPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [novita, setNovita] = useState([]);
  const [posti, setPosti] = useState([]);
  const [errore, setErrore] = useState(null);
  const [messaggio, setMessaggio] = useState(null);

  async function carica() {
    // l'admin vede anche le novita' nascoste (policy admin)
    const { data } = await supabase
      .from("novita")
      .select("*")
      .order("data_pubblicazione", { ascending: false });
    setNovita(data || []);
    const { data: p } = await supabase
      .from("posti")
      .select("id, nome, categoria, nuovo_dal")
      .order("categoria")
      .order("nome");
    setPosti(p || []);
  }

  useEffect(() => {
    async function inizia() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setErroreAccesso("Devi accedere per vedere questa pagina.");
        setCaricamento(false);
        return;
      }
      const { data: profilo } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!profilo || profilo.ruolo !== "admin") {
        setErroreAccesso("Questa pagina e' riservata all'amministratore.");
        setCaricamento(false);
        return;
      }
      await carica();
      setCaricamento(false);
    }
    inizia();
  }, []);

  function errorePersonale(error) {
    setErrore("Errore: " + error.message);
  }

  async function aggiungi(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const v = (n) => (f[n].value ? f[n].value : null);
    const { error } = await supabase.from("novita").insert({
      titolo_it: f.titolo_it.value,
      titolo_en: v("titolo_en"),
      testo_it: v("testo_it"),
      testo_en: v("testo_en"),
      link: v("link"),
      data_pubblicazione: v("data_pubblicazione") || new Date().toISOString().slice(0, 10),
    });
    if (error) return errorePersonale(error);
    f.reset();
    await carica();
  }

  async function salva(e, n) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const v = (x) => (f[x].value ? f[x].value : null);
    const { error } = await supabase
      .from("novita")
      .update({
        titolo_it: f.titolo_it.value,
        titolo_en: v("titolo_en"),
        testo_it: v("testo_it"),
        testo_en: v("testo_en"),
        link: v("link"),
        data_pubblicazione: v("data_pubblicazione") || n.data_pubblicazione,
      })
      .eq("id", n.id);
    if (error) return errorePersonale(error);
    setMessaggio("Salvato.");
    setTimeout(() => setMessaggio(null), 2000);
    await carica();
  }

  async function attiva(n, valore) {
    const { error } = await supabase.from("novita").update({ attiva: valore }).eq("id", n.id);
    if (error) return errorePersonale(error);
    await carica();
  }

  async function elimina(n) {
    if (!window.confirm("Eliminare questa novità?")) return;
    const { error } = await supabase.from("novita").delete().eq("id", n.id);
    if (error) return errorePersonale(error);
    await carica();
  }

  async function segnaNuovo(id, valore) {
    const { error } = await supabase.from("posti").update({ nuovo_dal: valore }).eq("id", id);
    if (error) return errorePersonale(error);
    await carica();
  }

  if (caricamento) {
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  }

  if (erroreAccesso) {
    return (
      <main>
        <div className="card">
          <p>{erroreAccesso}</p>
          <p>
            <a href="/login" className="btn">Vai al login</a>
          </p>
        </div>
      </main>
    );
  }

  const oggi = new Date().toISOString().slice(0, 10);
  const giorniDa = (d) => (Date.now() - new Date(d).getTime()) / 86400000;
  const nuovi = posti.filter((p) => p.nuovo_dal && giorniDa(p.nuovo_dal) <= 92);
  const altri = posti.filter((p) => !(p.nuovo_dal && giorniDa(p.nuovo_dal) <= 92));

  const campi = (n = {}) => (
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
        <input type="date" name="data_pubblicazione" defaultValue={n.data_pubblicazione || oggi} />
      </label>
    </>
  );

  return (
    <main>
      <h1>Novità</h1>
      <p className="muted">
        Le novità attive compaiono nella home degli ospiti e nella pagina Novità, nella loro lingua.
        Se manca il testo inglese viene mostrato l&apos;italiano.
      </p>

      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}
      {messaggio && <p style={{ color: "#1f5c2e" }}>{messaggio}</p>}

      <details className="card" style={{ marginBottom: "1.5rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Nuova novità</summary>
        <form onSubmit={aggiungi} style={{ marginTop: "1rem" }}>
          {campi()}
          <button type="submit" className="btn">
            Pubblica
          </button>
        </form>
      </details>

      <h2>Pubblicate</h2>
      <div className="card" style={{ marginBottom: "2rem" }}>
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
              <form onSubmit={(e) => salva(e, n)} style={{ marginTop: "0.5rem" }}>
                {campi(n)}
                <button type="submit" className="btn">
                  Salva
                </button>
              </form>
            </details>
            <div className="stato-actions">
              <button type="button" onClick={() => attiva(n, !n.attiva)}>
                {n.attiva ? "Nascondi" : "Mostra"}
              </button>{" "}
              <button type="button" onClick={() => elimina(n)}>
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2>Etichetta &quot;Nuovo&quot; sui posti</h2>
      <p className="muted">
        Il badge Nuovo/New compare per 3 mesi dalla data in cui lo segni e poi sparisce da solo.
      </p>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>Attualmente nuovi</h3>
        {nuovi.length === 0 && <p className="muted">Nessuno.</p>}
        {nuovi.map((p) => (
          <div key={p.id} className="richiesta-item">
            <strong>{p.nome}</strong>{" "}
            <span className="muted">
              ({CAT[p.categoria] || p.categoria}, dal {p.nuovo_dal})
            </span>{" "}
            <button type="button" onClick={() => segnaNuovo(p.id, null)}>
              Togli
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Segna un posto come nuovo</h3>
        <label>
          Scegli il posto
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) segnaNuovo(e.target.value, oggi);
              e.target.value = "";
            }}
          >
            <option value="">— scegli —</option>
            {altri.map((p) => (
              <option key={p.id} value={p.id}>
                {(CAT[p.categoria] || p.categoria) + " · " + p.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
    </main>
  );
}
