"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Cestino } from "../../components/IconeAzione";
import { capienza } from "../../../lib/cantina";

export default function ScaffaliCantinaPage() {
  const [stato, setStato] = useState("caricamento");
  const [scaffali, setScaffali] = useState([]);
  const [bott, setBott] = useState([]);
  const [errore, setErrore] = useState(null);

  async function carica() {
    const [s, b] = await Promise.all([
      supabase.from("cantina_scaffali").select("*").order("ordine"),
      supabase.from("cantina_bottiglie").select("scaffale_id, colonna, riga").limit(10000),
    ]);
    setScaffali(s.data || []);
    setBott(b.data || []);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setStato("login");
      const { data: p } = await supabase.from("profili").select("ruolo").eq("id", session.user.id).single();
      if (!p || p.ruolo !== "admin") return setStato("ruolo");
      await carica();
      setStato("ok");
    }
    init();
  }, []);

  function modifica(id, campo, valore) {
    setScaffali((prev) => prev.map((s) => (s.id === id ? { ...s, [campo]: valore } : s)));
  }

  async function salva(s) {
    setErrore(null);
    const colonne = parseInt(s.colonne, 10);
    const riga_min = parseInt(s.riga_min, 10);
    const riga_max = parseInt(s.riga_max, 10);
    if (!(colonne >= 1 && colonne <= 26) || !(riga_max >= riga_min)) return setErrore("Controlla colonne (1-26) e righe.");
    const fuori = bott.filter(
      (b) => b.scaffale_id === s.id && (b.colonna > colonne || b.riga < riga_min || b.riga > riga_max)
    ).length;
    if (fuori > 0) return setErrore(`Ci sono ${fuori} bottiglie fuori dalle nuove dimensioni: spostale prima dalla mappa.`);
    const { error } = await supabase
      .from("cantina_scaffali")
      .update({
        codice: s.codice.trim(),
        tipo: s.tipo,
        posizione: s.posizione || null,
        colonne,
        riga_min,
        riga_max,
        attivo: !!s.attivo,
        ordine: parseInt(s.ordine, 10) || 0,
      })
      .eq("id", s.id);
    if (error) return setErrore("Errore: " + error.message);
    await carica();
  }

  async function elimina(s) {
    if (bott.some((b) => b.scaffale_id === s.id)) return alert("Ci sono bottiglie in questa scaffalatura: toglile prima.");
    if (!window.confirm(`Eliminare la scaffalatura ${s.codice}?`)) return;
    await supabase.from("cantina_scaffali").delete().eq("id", s.id);
    await carica();
  }

  async function nuova() {
    const prossimo = String(scaffali.reduce((m, s) => Math.max(m, parseInt(s.codice, 10) || 0), 0) + 1).padStart(2, "0");
    const { error } = await supabase.from("cantina_scaffali").insert({
      codice: prossimo,
      tipo: "metallo e legno",
      posizione: "da collocare",
      colonne: 8,
      riga_min: 0,
      riga_max: 8,
      attivo: true,
      ordine: scaffali.length + 1,
    });
    if (error) return setErrore("Errore: " + error.message);
    await carica();
  }

  if (stato === "caricamento")
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  if (stato !== "ok")
    return (
      <main>
        <div className="card">
          <p>{stato === "login" ? "Devi accedere." : "Pagina riservata all'amministratore."}</p>
          <a href="/login" className="btn">
            Vai al login
          </a>
        </div>
      </main>
    );

  return (
    <main>
      <p>
        <a href="/cantina" className="btn btn-light">
          &larr; Mappa
        </a>
      </p>
      <h1>Scaffalature</h1>
      <p className="muted">
        Colonne con le lettere (A, B, C...). Le righe si contano dall&apos;alto: la fila sopra lo scaffale e&apos; la riga 0, poi 1, 2, 3...
        Per una scaffalatura con la fila sopra, "riga iniziale" = 0.
      </p>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
      {scaffali.map((s) => (
        <div key={s.id} className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "grid", gap: "0.5rem 1rem", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
            <label>
              Numero
              <input value={s.codice} onChange={(e) => modifica(s.id, "codice", e.target.value)} />
            </label>
            <label>
              Tipo
              <input value={s.tipo} onChange={(e) => modifica(s.id, "tipo", e.target.value)} />
            </label>
            <label style={{ gridColumn: "span 2" }}>
              Dove si trova
              <input value={s.posizione || ""} onChange={(e) => modifica(s.id, "posizione", e.target.value)} />
            </label>
            <label>
              Colonne
              <input type="number" min="1" max="26" value={s.colonne} onChange={(e) => modifica(s.id, "colonne", e.target.value)} />
            </label>
            <label>
              Riga iniziale (0 o 1)
              <input type="number" min="0" max="1" value={s.riga_min} onChange={(e) => modifica(s.id, "riga_min", e.target.value)} />
            </label>
            <label>
              Riga finale
              <input type="number" min="1" value={s.riga_max} onChange={(e) => modifica(s.id, "riga_max", e.target.value)} />
            </label>
            <label>
              Ordine
              <input type="number" value={s.ordine} onChange={(e) => modifica(s.id, "ordine", e.target.value)} />
            </label>
          </div>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400 }}>
            <input type="checkbox" style={{ width: "auto", margin: 0 }} checked={!!s.attivo} onChange={(e) => modifica(s.id, "attivo", e.target.checked)} />
            Montata e in uso
          </label>
          <p className="muted" style={{ margin: "0.3rem 0" }}>
            {capienza({ ...s, colonne: parseInt(s.colonne, 10) || 0, riga_min: parseInt(s.riga_min, 10) || 0, riga_max: parseInt(s.riga_max, 10) || 0 })} posti
          </p>
          <button type="button" className="btn" onClick={() => salva(s)}>
            Salva
          </button>
          <span style={{ marginLeft: "0.5rem" }}>
            <Cestino onClick={() => elimina(s)} />
          </span>
        </div>
      ))}
      <button type="button" className="btn btn-light" onClick={nuova}>
        Aggiungi una scaffalatura
      </button>
    </main>
  );
}
