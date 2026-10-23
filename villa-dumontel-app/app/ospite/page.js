"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const ETICHETTE_TIPO = {
  trasporto: "Trasporto",
  ristorante: "Ristorante",
  attivita: "Attività",
  pulizie: "Pulizie",
};

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

      {inCorso.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>Le tue richieste in corso</h2>
          {inCorso.map((r) => (
            <div key={r.id} className="richiesta-item">
              <span
                className={
                  "badge " + (r.stato === "confermata" ? "badge-confermata" : "badge-nuova")
                }
              >
                {r.stato === "confermata" ? "Prenotata" : "Inviata"}
              </span>{" "}
              <strong>{ETICHETTE_TIPO[r.tipo] || r.tipo}</strong>
              <p className="descrizione">
                {r.data || ""} {r.ora ? String(r.ora).slice(0, 5) : ""}
                {r.sotto_tipo ? ` — ${r.sotto_tipo}` : ""}
                {r.descrizione ? ` — ${r.descrizione}` : ""}
                {r.pax ? ` (${r.pax} pers.)` : ""}
              </p>
            </div>
          ))}
          <p style={{ margin: "0.75rem 0 0" }}>
            <a href="/ospite/prenota">Gestisci o annulla le richieste &rarr;</a>
          </p>
        </div>
      )}

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
