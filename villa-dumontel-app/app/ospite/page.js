"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function OspiteHome() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglia, setFamiglia] = useState(null);
  const [inCorso, setInCorso] = useState([]);

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

      const { data: ric } = await supabase
        .from("richieste")
        .select("*")
        .eq("famiglia_id", profilo.famiglia_id)
        .in("stato", ["nuova", "in gestione", "confermata"])
        .order("data", { ascending: true });
      setInCorso(ric || []);
      setCaricamento(false);
    }

    carica();
  }, []);

  const oggi = new Date().toISOString().slice(0, 10);
  const fra2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const pulizieDaPreparare = inCorso.filter(
    (r) => r.tipo === "pulizie" && r.data && r.data >= oggi && r.data <= fra2 && !r.descrizione
  );

  const inviate = inCorso.filter((r) => r.stato === "nuova" || r.stato === "in gestione").length;
  const prenotate = inCorso.filter((r) => r.stato === "confermata").length;

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

      {pulizieDaPreparare.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: "1rem", background: "#fff6e0" }}>
          <p style={{ margin: 0 }}>
            <strong>Pulizie il {r.data}{r.ora ? " alle " + String(r.ora).slice(0, 5) : ""}.</strong>{" "}
            Non hai ancora indicato cosa fare.{" "}
            <a href="/ospite/richieste">Indicalo ora &rarr;</a>
          </p>
        </div>
      ))}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Richieste</h2>
        <p style={{ margin: "0.25rem 0" }}>
          <strong>{inviate}</strong> inviate &middot; <strong>{prenotate}</strong> prenotate
        </p>
        <p style={{ margin: "0.75rem 0 0", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <a href="/ospite/prenota" className="btn">
            Prenota
          </a>
          <a href="/ospite/richieste">Vedi le richieste &rarr;</a>
        </p>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <a href="/ospite/costi" className="card">
          <h2>I miei costi</h2>
          <p className="muted">Spese, versamenti e saldo per anno.</p>
        </a>
        <a href="/info" className="card">
          <h2>Informazioni</h2>
          <p className="muted">Contatti, Wi-fi, ristoranti, bar e attivit&agrave;.</p>
        </a>
      </div>
    </main>
  );
}
