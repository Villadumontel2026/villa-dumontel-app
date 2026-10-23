"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function CollaboratriciPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);

  const [collaboratori, setCollaboratori] = useState([]);
  const [turni, setTurni] = useState([]);
  const [pagamentiCollab, setPagamentiCollab] = useState([]);
  const [alloggiList, setAlloggiList] = useState([]);

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
        .eq("stato", "approvato")
        .eq("storico", false);
      setTurni(turniData || []);

      const { data: pagCollabData } = await supabase
        .from("pagamenti_collaboratori")
        .select("*")
        .eq("storico", false);
      setPagamentiCollab(pagCollabData || []);

      const { data: alloggiData } = await supabase.from("alloggi").select("*");
      setAlloggiList(alloggiData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  async function eliminaVersamento(id) {
    if (!window.confirm("Eliminare questo versamento? Verra' tolta anche la spesa collegata.")) return;
    const { error } = await supabase.from("pagamenti_collaboratori").delete().eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setPagamentiCollab((prev) => prev.filter((p) => p.id !== id));
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
              Dovuto (turni effettuati): {c.dovuto.toFixed(2)} &euro;
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

      <h2 style={{ marginTop: "2rem" }}>Ultimi versamenti</h2>
      <div className="card">
        {pagamentiCollab.length === 0 && <p className="muted">Nessun versamento registrato.</p>}
        {[...pagamentiCollab]
          .sort((a, b) => String(b.data).localeCompare(String(a.data)) || b.id - a.id)
          .map((p) => {
            const c = collaboratori.find((x) => x.id === p.collaboratore_id);
            const al = alloggiList.find((x) => x.id === p.alloggio_id);
            return (
              <div key={p.id} className="richiesta-item">
                <strong>{Number(p.importo).toFixed(2)} &euro;</strong> &mdash; {c?.nome}{" "}
                &mdash; {al?.nome}
                <p className="descrizione">
                  {p.data}
                  {p.note ? ` (${p.note})` : ""}
                </p>
                <div className="stato-actions">
                  <button onClick={() => eliminaVersamento(p.id)}>Elimina</button>
                </div>
              </div>
            );
          })}
      </div>
    </main>
  );
}
