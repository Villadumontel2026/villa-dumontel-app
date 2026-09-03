"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function CollaboratriciPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);

  const [collaboratori, setCollaboratori] = useState([]);
  const [turni, setTurni] = useState([]);
  const [pagamentiCollab, setPagamentiCollab] = useState([]);

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

      const { data: collaboratoriData } = await supabase
        .from("collaboratori")
        .select("*");
      setCollaboratori(collaboratoriData || []);

      const { data: turniData } = await supabase
        .from("turni_pulizia")
        .select("*")
        .eq("stato", "approvato");
      setTurni(turniData || []);

      const { data: pagCollabData } = await supabase
        .from("pagamenti_collaboratori")
        .select("*");
      setPagamentiCollab(pagCollabData || []);

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

  const situazione = collaboratori.map((c) => {
    const dovuto = turni
      .filter((t) => t.collaboratore_id === c.id)
      .reduce((s, t) => s + (t.importo_dovuto || 0), 0);
    const pagato = pagamentiCollab
      .filter((p) => p.collaboratore_id === c.id)
      .reduce((s, p) => s + (p.importo || 0), 0);
    return { ...c, dovuto, pagato, saldo: dovuto - pagato };
  });

  return (
    <main>
      <p>
        <a href="/pulizie/admin">&larr; Pulizie</a>
      </p>
      <h1>Collaboratrici</h1>

      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/pulizie/admin/collaboratrici/nuovo" className="btn">
          Registra un versamento
        </a>
      </p>

      <div style={{ display: "grid", gap: "1rem" }}>
        {situazione.map((c) => (
          <div key={c.id} className="card">
            <h3 style={{ marginBottom: "0.25rem" }}>{c.nome}</h3>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Dovuto (turni approvati): {c.dovuto.toFixed(2)} &euro;
            </p>
            <p className="muted" style={{ margin: "0.25rem 0" }}>
              Gia&apos; versato: {c.pagato.toFixed(2)} &euro;
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Saldo residuo: {c.saldo.toFixed(2)} &euro;</strong>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
