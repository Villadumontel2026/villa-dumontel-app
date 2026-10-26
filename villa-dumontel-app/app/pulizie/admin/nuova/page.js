"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import FormRichiesta from "../../../components/FormRichiesta";

export default function NuovaPuliziaAdminPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [alloggi, setAlloggi] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [inviata, setInviata] = useState(false);

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
      const { data: a } = await supabase.from("alloggi").select("*");
      setAlloggi(a || []);
      const { data: c } = await supabase.from("collaboratori").select("*");
      setCollaboratori(c || []);
      setCaricamento(false);
    }
    carica();
  }, []);

  async function crea(valori) {
    setInviata(false);
    const alloggio = alloggi.find((a) => String(a.id) === String(valori.alloggio_id));
    const { error } = await supabase.from("richieste").insert({
      ...valori,
      famiglia_id: alloggio?.famiglia_id || null,
      stato: "nuova",
    });
    if (error) return "Errore: " + error.message;
    setInviata(true);
    return null;
  }

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
            <a href="/login" className="btn">
              Vai al login
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <p>
        <a href="/pulizie/admin" className="btn btn-light">
          &larr; Pulizie
        </a>
      </p>
      <h1>Nuova prenotazione pulizie</h1>
      <p className="muted">
        Scegli alloggio, data, ora e durata. Se assegni una collaboratrice, riceve la richiesta da
        accettare; l&apos;ospite potr&agrave; indicare o modificare cosa fare.
      </p>

      {inviata && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p>
            Pulizia creata.{" "}
            <a href="/richieste" className="btn btn-light">
              Vai alle richieste
            </a>
          </p>
        </div>
      )}

      <div className="card">
        <FormRichiesta
          alloggi={alloggi}
          collaboratori={collaboratori}
          tipoIniziale="pulizie"
          soloTipo
          onSubmit={crea}
          etichettaBottone="Crea prenotazione pulizie"
        />
      </div>
    </main>
  );
}
