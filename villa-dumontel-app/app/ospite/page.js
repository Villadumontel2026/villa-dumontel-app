"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function OspiteHome() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglia, setFamiglia] = useState(null);

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

      const { data: fam } = await supabase
        .from("famiglie")
        .select("*")
        .eq("id", profilo.famiglia_id)
        .single();
      setFamiglia(fam);
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

  return (
    <main>
      <h1>Benvenuti{famiglia?.nome ? `, ${famiglia.nome}` : ""}</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        Cosa desiderate fare?
      </p>

      <div style={{ display: "grid", gap: "1rem" }}>
        <a href="/ospite/costi" className="card">
          <h2>I miei costi</h2>
          <p className="muted">Spese, versamenti e saldo per anno.</p>
        </a>
        <a href="/info" className="card">
          <h2>Informazioni</h2>
          <p className="muted">Contatti, Wi-fi, ristoranti, bar e attivit&agrave;.</p>
        </a>
        <a href="/ospite/prenota" className="card">
          <h2>Prenota / Le mie richieste</h2>
          <p className="muted">Ristoranti, attivit&agrave;, trasporti, pulizie.</p>
        </a>
      </div>
    </main>
  );
}
