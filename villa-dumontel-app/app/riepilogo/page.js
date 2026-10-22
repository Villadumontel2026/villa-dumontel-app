"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const ANNO_CORRENTE = new Date().getFullYear();

function anno(dataStr) {
  if (!dataStr) return null;
  return parseInt(String(dataStr).slice(0, 4), 10);
}

export default function RiepilogoPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);

  const [famiglie, setFamiglie] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
  const [pagamentiCollab, setPagamentiCollab] = useState([]);
  const [speseFamiglia, setSpeseFamiglia] = useState([]);
  const [pagamentiFam, setPagamentiFam] = useState([]);

  const [annoSelezionato, setAnnoSelezionato] = useState(String(ANNO_CORRENTE));

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

      if (!profilo || profilo.ruolo !== "admin") {
        setErroreAccesso("Questa pagina e' riservata all'amministratore.");
        setCaricamento(false);
        return;
      }

      const { data: famiglieData } = await supabase.from("famiglie").select("*");
      setFamiglie(famiglieData || []);

      const { data: alloggiData } = await supabase.from("alloggi").select("*");
      setAlloggi(alloggiData || []);

      const { data: pagCollabData } = await supabase
        .from("pagamenti_collaboratori")
        .select("*");
      setPagamentiCollab(pagCollabData || []);

      const { data: speseData } = await supabase
        .from("spese_famiglia")
        .select("*");
      setSpeseFamiglia(speseData || []);

      const { data: pagFamData } = await supabase
        .from("pagamenti_famiglie")
        .select("*");
      setPagamentiFam(pagFamData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  const anniDisponibili = useMemo(() => {
    const anni = new Set();
    speseFamiglia.forEach((s) => anni.add(s.anno_riferimento || anno(s.data)));
    pagamentiFam.forEach((p) => anni.add(anno(p.data)));
    anni.add(ANNO_CORRENTE);
    return Array.from(anni)
      .filter(Boolean)
      .sort((a, b) => b - a);
  }, [speseFamiglia, pagamentiFam]);

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

  const annoSpesa = (s) => s.anno_riferimento || anno(s.data);
  const tutti = annoSelezionato === "tutti";
  const Y = parseInt(annoSelezionato, 10);

  const riepilogo = famiglie.map((f) => {
    const spese = speseFamiglia.filter((s) => s.famiglia_id === f.id);
    const incassi = pagamentiFam.filter((p) => p.famiglia_id === f.id);
    const somma = (arr) => arr.reduce((t, r) => t + (r.importo || 0), 0);

    const totaleSpese = somma(spese.filter((s) => tutti || annoSpesa(s) === Y));
    const totaleIncassato = somma(incassi.filter((p) => tutti || anno(p.data) === Y));
    const riporto = tutti
      ? 0
      : somma(spese.filter((s) => annoSpesa(s) < Y)) -
        somma(incassi.filter((p) => anno(p.data) < Y));

    return {
      ...f,
      totaleSpese,
      riporto,
      totaleIncassato,
      saldo: riporto + totaleSpese - totaleIncassato,
    };
  });

  return (
    <main>
      <p>
        <a href="/richieste">&larr; Richieste</a>
      </p>
      <h1>Riepilogo</h1>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Spese per anno di competenza, incassi per data. Il saldo include il riporto degli anni precedenti.
      </p>

      <label style={{ maxWidth: "220px", marginBottom: "1.5rem" }}>
        Anno
        <select
          value={annoSelezionato}
          onChange={(e) => setAnnoSelezionato(e.target.value)}
        >
          {anniDisponibili.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
          <option value="tutti">Tutti gli anni (verifica)</option>
        </select>
      </label>

      <div style={{ display: "grid", gap: "1rem" }}>
        {riepilogo.map((f) => (
          <div key={f.id} className="card">
            <h2 style={{ marginBottom: "0.5rem" }}>{f.nome}</h2>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Riporto anni precedenti: {f.riporto.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Spese dell&apos;anno (pulizie e gasolio incluse): {f.totaleSpese.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Gia&apos; incassato: {f.totaleIncassato.toFixed(2)} &euro;
            </p>
            <p style={{ margin: "0.5rem 0 0" }}>
              <strong>Saldo: {f.saldo.toFixed(2)} &euro;</strong>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
