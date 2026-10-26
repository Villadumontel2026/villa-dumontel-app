"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const ANNO_CORRENTE = new Date().getFullYear();

function annoSpesa(s) {
  return s.anno_riferimento || parseInt(String(s.data || "").slice(0, 4), 10) || null;
}

export default function SpeseAdminPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
  const [spese, setSpese] = useState([]);
  const [versamenti, setVersamenti] = useState([]);
  const [filtroFamiglia, setFiltroFamiglia] = useState("tutte");
  const [filtroAnno, setFiltroAnno] = useState(String(ANNO_CORRENTE));
  const [annoRiep, setAnnoRiep] = useState(String(ANNO_CORRENTE));

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

      const { data: speseData } = await supabase
        .from("spese_famiglia")
        .select("*, famiglie(nome)")
        .order("data", { ascending: false });
      setSpese(speseData || []);

      const { data: versData } = await supabase
        .from("pagamenti_famiglie")
        .select("*, famiglie(nome)")
        .order("data", { ascending: false });
      setVersamenti(versData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  async function eliminaSpesa(id) {
    if (!window.confirm("Eliminare definitivamente questa spesa?")) return;
    const { error } = await supabase.from("spese_famiglia").delete().eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setSpese((prev) => prev.filter((x) => x.id !== id));
  }

  async function eliminaVersamento(id) {
    if (!window.confirm("Eliminare definitivamente questo versamento?")) return;
    const { error } = await supabase.from("pagamenti_famiglie").delete().eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setVersamenti((prev) => prev.filter((x) => x.id !== id));
  }

  const anni = useMemo(() => {
    const set = new Set([ANNO_CORRENTE]);
    spese.forEach((x) => set.add(annoSpesa(x)));
    versamenti.forEach((v) => set.add(parseInt(String(v.data || "").slice(0, 4), 10)));
    return Array.from(set).filter(Boolean).sort((a, b) => b - a);
  }, [spese, versamenti]);

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

  const filtrate = spese.filter(
    (x) =>
      (filtroFamiglia === "tutte" || String(x.famiglia_id) === filtroFamiglia) &&
      (filtroAnno === "tutti" || annoSpesa(x) === parseInt(filtroAnno, 10))
  );

  const famiglieMostrate = famiglie.filter(
    (f) => filtroFamiglia === "tutte" || String(f.id) === filtroFamiglia
  );
  const totali = famiglieMostrate.map((f) => ({
    ...f,
    totale: filtrate
      .filter((x) => x.famiglia_id === f.id)
      .reduce((t, r) => t + (r.importo || 0), 0),
  }));
  const annoDi = (d) => parseInt(String(d || "").slice(0, 4), 10);
  const sommaImp = (arr) => arr.reduce((t, r) => t + (r.importo || 0), 0);
  const tuttiAnni = annoRiep === "tutti";
  const YR = parseInt(annoRiep, 10);
  const riepiloghi = famiglie.map((f) => {
    const sp = spese.filter((x) => x.famiglia_id === f.id);
    const inc = versamenti.filter((x) => x.famiglia_id === f.id);
    const riporto = tuttiAnni
      ? 0
      : sommaImp(sp.filter((x) => annoSpesa(x) < YR)) - sommaImp(inc.filter((x) => annoDi(x.data) < YR));
    const speseAnno = sommaImp(sp.filter((x) => tuttiAnni || annoSpesa(x) === YR));
    const incassiAnno = sommaImp(inc.filter((x) => tuttiAnni || annoDi(x.data) === YR));
    return { ...f, riporto, spese: speseAnno, incassi: incassiAnno, saldo: riporto + speseAnno - incassiAnno };
  });

  const versFiltrati = versamenti.filter(
    (x) =>
      (filtroFamiglia === "tutte" || String(x.famiglia_id) === filtroFamiglia) &&
      (filtroAnno === "tutti" || parseInt(String(x.data || "").slice(0, 4), 10) === parseInt(filtroAnno, 10))
  );
  const totaleVersamenti = versFiltrati.reduce((t, r) => t + (r.importo || 0), 0);
  const totaleGenerale = filtrate.reduce((t, r) => t + (r.importo || 0), 0);

  return (
    <main>
      <h1>Spese</h1>

      <p style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <a href="/spese/admin/nuova" className="btn">
          Aggiungi una spesa
        </a>
        <a href="/spese/admin/versamento" className="btn">
          Registra un versamento
        </a>
      </p>

      <h2>Riepilogo</h2>
      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        Spese per anno di competenza, versamenti per data. Il saldo include il riporto degli anni precedenti.
      </p>
      <label style={{ maxWidth: "220px", marginBottom: "1rem" }}>
        Anno del riepilogo
        <select value={annoRiep} onChange={(e) => setAnnoRiep(e.target.value)}>
          {anni.map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
          <option value="tutti">Tutti gli anni (verifica)</option>
        </select>
      </label>

      <div style={{ display: "grid", gap: "1rem", marginBottom: "2.5rem" }}>
        {riepiloghi.map((f) => (
          <div key={f.id} className="card">
            <h3 style={{ marginBottom: "0.5rem" }}>{f.nome}</h3>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Riporto anni precedenti: {f.riporto.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Spese dell&apos;anno (pulizie e gasolio incluse): {f.spese.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Gi&agrave; incassato: {f.incassi.toFixed(2)} &euro;
            </p>
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                fontWeight: 600,
                background: f.saldo > 0 ? "#fde2e2" : "#dff3e3",
                color: f.saldo > 0 ? "#8a1f1f" : "#1f5c2e",
              }}
            >
              {f.saldo > 0
                ? `Da incassare: ${f.saldo.toFixed(2)} €`
                : f.saldo < 0
                ? `Credito della famiglia: ${(-f.saldo).toFixed(2)} €`
                : "Saldo in pari: 0.00 €"}
            </div>
          </div>
        ))}
      </div>

      <h2>Elenco spese e versamenti</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <label style={{ minWidth: "200px" }}>
          Famiglia
          <select value={filtroFamiglia} onChange={(e) => setFiltroFamiglia(e.target.value)}>
            <option value="tutte">Tutte le famiglie</option>
            {famiglie.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label style={{ minWidth: "160px" }}>
          Anno
          <select value={filtroAnno} onChange={(e) => setFiltroAnno(e.target.value)}>
            {anni.map((a) => (
              <option key={a} value={String(a)}>
                {a}
              </option>
            ))}
            <option value="tutti">Tutti gli anni</option>
          </select>
        </label>
      </div>

      <h2>
        Elenco{" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          ({filtrate.length} spese)
        </span>
      </h2>
      <div className="card">
        {filtrate.length === 0 && <p className="muted">Nessuna spesa per questa selezione.</p>}
        {filtrate.map((s) => (
          <div key={s.id} className="richiesta-item">
            <strong>{s.oggetto}</strong> &mdash; {s.famiglie?.nome}
            <p className="descrizione">
              {s.data}
              {s.anno_riferimento && String(s.anno_riferimento) !== String(s.data).slice(0, 4)
                ? ` (competenza ${s.anno_riferimento})`
                : ""}{" "}
              &mdash; {Number(s.importo).toFixed(2)} &euro;
              {s.note ? ` (${s.note})` : ""}
            </p>
            {s.pagamento_collaboratore_id ? (
              <p className="muted" style={{ fontSize: "0.85em", margin: "0.25rem 0 0" }}>
                Generata da un versamento alla collaboratrice: si modifica da Pulizie &gt; Collaboratrici.
              </p>
            ) : (
              <div className="stato-actions">
                <a href={"/spese/admin/modifica?id=" + s.id}>
                  <button type="button">Modifica</button>
                </a>{" "}
                <button type="button" onClick={() => eliminaSpesa(s.id)}>
                  Elimina
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: "2rem" }}>
        Versamenti degli ospiti{" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          ({versFiltrati.length} &mdash; {totaleVersamenti.toFixed(2)} &euro;)
        </span>
      </h2>
      <div className="card">
        {versFiltrati.length === 0 && <p className="muted">Nessun versamento per questa selezione.</p>}
        {versFiltrati.map((v) => (
          <div key={v.id} className="richiesta-item">
            <strong>{Number(v.importo).toFixed(2)} &euro;</strong> &mdash; {v.famiglie?.nome}
            <p className="descrizione">
              {v.data}
              {v.metodo ? ` — ${v.metodo}` : ""}
              {v.note ? ` (${v.note})` : ""}
            </p>
            <div className="stato-actions">
              <button type="button" onClick={() => eliminaVersamento(v.id)}>
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
