"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const ETICHETTE_STATO = {
  "da approvare": "da validare",
  approvato: "effettuato",
  rifiutato: "rifiutato",
};

function classeBadgeStato(stato) {
  if (stato === "da approvare") return "badge badge-nuova";
  if (stato === "approvato") return "badge badge-confermata";
  if (stato === "rifiutato") return "badge badge-completata";
  return "badge";
}

export default function PaginaCollaboratrice() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [collaboratore, setCollaboratore] = useState(null);
  const [turni, setTurni] = useState([]);
  const [pagamenti, setPagamenti] = useState([]);

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

      if (!profilo || profilo.ruolo !== "collaboratore" || !profilo.collaboratore_id) {
        setErroreAccesso("Questa pagina e' riservata alle collaboratrici.");
        setCaricamento(false);
        return;
      }

      const { data: collab } = await supabase
        .from("collaboratori")
        .select("*")
        .eq("id", profilo.collaboratore_id)
        .single();
      setCollaboratore(collab);

      const { data: turniData } = await supabase
        .from("turni_pulizia")
        .select("*, alloggi(nome)")
        .eq("collaboratore_id", profilo.collaboratore_id)
        .eq("storico", false)
        .order("data", { ascending: false });
      setTurni(turniData || []);

      const { data: pagamentiData } = await supabase
        .from("pagamenti_collaboratori")
        .select("*")
        .eq("collaboratore_id", profilo.collaboratore_id)
        .eq("storico", false);
      setPagamenti(pagamentiData || []);

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

  const totaleDovuto = turni
    .filter((t) => t.stato === "approvato")
    .reduce((s, t) => s + (t.importo_dovuto || 0), 0);
  const totalePagato = pagamenti.reduce((s, p) => s + (p.importo || 0), 0);
  const saldo = totaleDovuto - totalePagato;

  return (
    <main>
      <h1>Ciao {collaboratore?.nome}</h1>

      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/pulizie/collaboratore/nuovo" className="btn">
          Segnala un turno
        </a>
      </p>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Il tuo saldo</h2>
        <p>Totale dovuto (turni effettuati): {totaleDovuto.toFixed(2)} &euro;</p>
        <p>Totale gia&apos; ricevuto: {totalePagato.toFixed(2)} &euro;</p>
        <p>
          <strong>Saldo residuo: {saldo.toFixed(2)} &euro;</strong>
        </p>
      </div>

      <h2>I tuoi turni</h2>
      <div className="card">
        {turni.length === 0 && <p className="muted">Nessun turno registrato.</p>}
        {turni.map((t) => (
          <div key={t.id} className="richiesta-item">
            <span className={classeBadgeStato(t.stato)}>{ETICHETTE_STATO[t.stato] || t.stato}</span>{" "}
            <strong>{t.alloggi?.nome}</strong> &mdash; {t.data} &mdash; {t.ore} ore
            {t.note && <p className="descrizione">{t.note}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
