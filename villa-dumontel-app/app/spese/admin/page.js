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
  const [filtroFamiglia, setFiltroFamiglia] = useState("tutte");
  const [filtroAnno, setFiltroAnno] = useState(String(ANNO_CORRENTE));

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

  const anni = useMemo(() => {
    const set = new Set([ANNO_CORRENTE]);
    spese.forEach((x) => set.add(annoSpesa(x)));
    return Array.from(set).filter(Boolean).sort((a, b) => b - a);
  }, [spese]);

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
  const totaleGenerale = filtrate.reduce((t, r) => t + (r.importo || 0), 0);

  return (
    <main>
      <h1>Spese</h1>

      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/spese/admin/nuova" className="btn">
          Aggiungi una spesa
        </a>
      </p>

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

      <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
        {totali.map((f) => (
          <div key={f.id} className="card">
            <h3 style={{ marginBottom: "0.25rem" }}>{f.nome}</h3>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Totale spese: {f.totale.toFixed(2)} &euro;</strong>
            </p>
          </div>
        ))}
        {totali.length > 1 && (
          <div className="card">
            <p style={{ margin: 0 }}>
              <strong>Totale complessivo: {totaleGenerale.toFixed(2)} &euro;</strong>
            </p>
          </div>
        )}
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
    </main>
  );
}
