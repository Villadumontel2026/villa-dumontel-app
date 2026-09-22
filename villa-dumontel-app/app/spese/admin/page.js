"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function SpeseAdminPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
  const [spese, setSpese] = useState([]);

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

  const totali = famiglie.map((f) => {
    const totale = spese
      .filter((s) => s.famiglia_id === f.id)
      .reduce((s, r) => s + (r.importo || 0), 0);
    return { ...f, totale };
  });

  return (
    <main>
      <p>
        <a href="/richieste">&larr; Richieste</a>
      </p>
      <h1>Spese generiche</h1>

      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/spese/admin/nuova" className="btn">
          Aggiungi una spesa
        </a>
      </p>

      <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
        {totali.map((f) => (
          <div key={f.id} className="card">
            <h3 style={{ marginBottom: "0.25rem" }}>{f.nome}</h3>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Totale spese: {f.totale.toFixed(2)} &euro;</strong>
            </p>
          </div>
        ))}
      </div>

      <h2>Tutte le spese</h2>
      <div className="card">
        {spese.length === 0 && <p className="muted">Nessuna spesa registrata.</p>}
        {spese.map((s) => (
          <div key={s.id} className="richiesta-item">
            <strong>{s.oggetto}</strong> &mdash; {s.famiglie?.nome}
            <p className="descrizione">
              {s.data} &mdash; {Number(s.importo).toFixed(2)} &euro;
              {s.note ? ` (${s.note})` : ""}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
