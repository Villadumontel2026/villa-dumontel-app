"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

function classeBadgeStato(stato) {
  if (stato === "da approvare") return "badge badge-nuova";
  if (stato === "approvato") return "badge badge-confermata";
  if (stato === "rifiutato") return "badge badge-completata";
  return "badge";
}

export default function StoricoTurniPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [turni, setTurni] = useState([]);

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

      const { data } = await supabase
        .from("turni_pulizia")
        .select("*, alloggi(nome), collaboratori(nome)")
        .order("data", { ascending: false });
      setTurni(data || []);
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
      <p>
        <a href="/pulizie/admin">&larr; Pulizie</a>
      </p>
      <h1>Storico turni</h1>

      <div className="card">
        {turni.length === 0 && <p className="muted">Nessun turno registrato.</p>}
        {turni.map((t) => (
          <div key={t.id} className="richiesta-item">
            <span className={classeBadgeStato(t.stato)}>{t.stato}</span>{" "}
            <strong>{t.collaboratori?.nome}</strong> &mdash; {t.alloggi?.nome}{" "}
            &mdash; {t.data} &mdash; {t.ore} ore
            {t.note && <p className="descrizione">{t.note}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
