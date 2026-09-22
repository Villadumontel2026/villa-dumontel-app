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
    pagamentiCollab.forEach((p) => anni.add(anno(p.data)));
    speseFamiglia.forEach((s) => anni.add(anno(s.data)));
    pagamentiFam.forEach((p) => anni.add(anno(p.data)));
    anni.add(ANNO_CORRENTE);
    return Array.from(anni)
      .filter(Boolean)
      .sort((a, b) => b - a);
  }, [pagamentiCollab, speseFamiglia, pagamentiFam]);

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

  const filtroAnno = (dataStr) =>
    annoSelezionato === "tutti" || anno(dataStr) === parseInt(annoSelezionato, 10);

  const riepilogo = famiglie.map((f) => {
    const alloggiFamiglia = alloggi
      .filter((a) => a.famiglia_id === f.id)
      .map((a) => a.id);

    const totalePulizie = pagamentiCollab
      .filter((p) => alloggiFamiglia.includes(p.alloggio_id) && filtroAnno(p.data))
      .reduce((s, p) => s + (p.importo || 0), 0);

    const totaleSpese = speseFamiglia
      .filter((s) => s.famiglia_id === f.id && filtroAnno(s.data))
      .reduce((s, r) => s + (r.importo || 0), 0);

    const totaleDovuto = totalePulizie + totaleSpese;

    const totaleIncassato = pagamentiFam
      .filter((p) => p.famiglia_id === f.id && filtroAnno(p.data))
      .reduce((s, p) => s + (p.importo || 0), 0);

    return {
      ...f,
      totalePulizie,
      totaleSpese,
      totaleDovuto,
      totaleIncassato,
      saldo: totaleDovuto - totaleIncassato,
    };
  });

  return (
    <main>
      <p>
        <a href="/richieste">&larr; Richieste</a>
      </p>
      <h1>Riepilogo</h1>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Pulizie + spese generiche per famiglia. Il gasolio verra&apos; aggiunto in seguito.
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
              Pulizie: {f.totalePulizie.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Spese generiche: {f.totaleSpese.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Totale dovuto: {f.totaleDovuto.toFixed(2)} &euro;
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
