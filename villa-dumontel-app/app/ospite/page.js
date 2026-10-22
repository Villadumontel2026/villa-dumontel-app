"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const ANNO_CORRENTE = new Date().getFullYear();

function anno(dataStr) {
  if (!dataStr) return null;
  return parseInt(String(dataStr).slice(0, 4), 10);
}

function euro(n) {
  return Number(n || 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CostiOspitePage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [spese, setSpese] = useState([]);
  const [incassi, setIncassi] = useState([]);
  const [annoSel, setAnnoSel] = useState(String(ANNO_CORRENTE));

  useEffect(() => {
    async function carica() {
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

      if (!profilo || profilo.ruolo !== "ospite" || !profilo.famiglia_id) {
        setErroreAccesso("Questa pagina e' riservata agli ospiti.");
        setCaricamento(false);
        return;
      }

      const { data: speseData } = await supabase
        .from("spese_famiglia")
        .select("*")
        .eq("famiglia_id", profilo.famiglia_id)
        .order("data", { ascending: false });
      setSpese(speseData || []);

      const { data: incassiData } = await supabase
        .from("pagamenti_famiglie")
        .select("*")
        .eq("famiglia_id", profilo.famiglia_id)
        .order("data", { ascending: false });
      setIncassi(incassiData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  const annoSpesa = (s) => s.anno_riferimento || anno(s.data);

  const anni = useMemo(() => {
    const set = new Set([ANNO_CORRENTE]);
    spese.forEach((s) => set.add(annoSpesa(s)));
    incassi.forEach((p) => set.add(anno(p.data)));
    return Array.from(set).filter(Boolean).sort((a, b) => b - a);
  }, [spese, incassi]);

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
            <a href="/login">Vai al login &rarr;</a>
          </p>
        </div>
      </main>
    );
  }

  const Y = parseInt(annoSel, 10);
  const somma = (arr) => arr.reduce((t, r) => t + (r.importo || 0), 0);

  const speseAnno = spese.filter((s) => annoSpesa(s) === Y);
  const incassiAnno = incassi.filter((p) => anno(p.data) === Y);
  const riporto =
    somma(spese.filter((s) => annoSpesa(s) < Y)) -
    somma(incassi.filter((p) => anno(p.data) < Y));
  const totSpese = somma(speseAnno);
  const totIncassi = somma(incassiAnno);
  const saldo = riporto + totSpese - totIncassi;

  return (
    <main>
      <p>
        <a href="/ospite">&larr; Home</a>
      </p>
      <h1>I miei costi</h1>

      <label style={{ maxWidth: "200px", marginBottom: "1.5rem" }}>
        Anno
        <select value={annoSel} onChange={(e) => setAnnoSel(e.target.value)}>
          {anni.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="muted" style={{ margin: "0.25rem 0" }}>
          Riporto anni precedenti: {euro(riporto)} &euro;
        </p>
        <p className="muted" style={{ margin: "0.25rem 0" }}>
          Spese {Y}: {euro(totSpese)} &euro;
        </p>
        <p className="muted" style={{ margin: "0.25rem 0" }}>
          Versamenti {Y}: {euro(totIncassi)} &euro;
        </p>
        <p style={{ margin: "0.5rem 0 0" }}>
          <strong>
            {saldo > 0
              ? `Da versare: ${euro(saldo)} €`
              : saldo < 0
              ? `Credito: ${euro(-saldo)} €`
              : "Saldo in pari"}
          </strong>
        </p>
      </div>

      <h2>Spese {Y}</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {speseAnno.length === 0 && <p className="muted">Nessuna spesa.</p>}
        {speseAnno.map((s) => (
          <div key={s.id} className="richiesta-item">
            <strong>{s.oggetto}</strong>
            <p className="descrizione">
              {s.data} &mdash; {euro(s.importo)} &euro;
              {s.note ? ` (${s.note})` : ""}
            </p>
          </div>
        ))}
      </div>

      <h2>Versamenti {Y}</h2>
      <div className="card">
        {incassiAnno.length === 0 && <p className="muted">Nessun versamento.</p>}
        {incassiAnno.map((p) => (
          <div key={p.id} className="richiesta-item">
            <strong>{euro(p.importo)} &euro;</strong>
            <p className="descrizione">
              {p.data}
              {p.metodo ? ` — ${p.metodo}` : ""}
              {p.note ? ` (${p.note})` : ""}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
