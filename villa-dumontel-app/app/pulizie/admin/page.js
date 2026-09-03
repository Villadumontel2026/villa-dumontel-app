"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function PaginaAdminPulizie() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [turniDaApprovare, setTurniDaApprovare] = useState([]);

  async function caricaTurniDaApprovare() {
    const { data } = await supabase
      .from("turni_pulizia")
      .select("*, alloggi(nome), collaboratori(nome)")
      .eq("stato", "da approvare")
      .order("data", { ascending: false });
    setTurniDaApprovare(data || []);
  }

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

      await caricaTurniDaApprovare();
      setCaricamento(false);
    }

    carica();
  }, []);

  async function approvaTurno(id) {
    const { error } = await supabase
      .from("turni_pulizia")
      .update({ stato: "approvato" })
      .eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    await caricaTurniDaApprovare();
  }

  async function rifiutaTurno(id) {
    const { error } = await supabase
      .from("turni_pulizia")
      .update({ stato: "rifiutato" })
      .eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    await caricaTurniDaApprovare();
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

  return (
    <main>
      <p>
        <a href="/richieste">&larr; Richieste</a>
      </p>
      <h1>Pulizie</h1>

      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
        <a href="/pulizie/admin/collaboratrici" className="card" style={{ display: "block" }}>
          <h2 style={{ marginBottom: "0.25rem" }}>Collaboratrici</h2>
          <p className="muted" style={{ margin: 0 }}>
            Saldo e versamenti verso chi fa le pulizie
          </p>
        </a>
        <a href="/pulizie/admin/famiglie" className="card" style={{ display: "block" }}>
          <h2 style={{ marginBottom: "0.25rem" }}>Famiglie</h2>
          <p className="muted" style={{ margin: 0 }}>
            Quanto addebitare e quanto e' stato incassato
          </p>
        </a>
        <a href="/pulizie/admin/storico" className="card" style={{ display: "block" }}>
          <h2 style={{ marginBottom: "0.25rem" }}>Storico turni</h2>
          <p className="muted" style={{ margin: 0 }}>
            Tutti i turni approvati e rifiutati
          </p>
        </a>
      </div>

      <h2>
        Turni da approvare{" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          ({turniDaApprovare.length})
        </span>
      </h2>
      {turniDaApprovare.length === 0 && (
        <p className="muted">Nessun turno in attesa.</p>
      )}
      {turniDaApprovare.length > 0 && (
        <div className="card">
          {turniDaApprovare.map((t) => (
            <div key={t.id} className="richiesta-item">
              <span className="badge badge-nuova">da approvare</span>{" "}
              <strong>{t.collaboratori?.nome}</strong> &mdash; {t.alloggi?.nome}{" "}
              &mdash; {t.data} &mdash; {t.ore} ore
              {t.note && <p className="descrizione">{t.note}</p>}
              <div className="stato-actions">
                <button className="btn" onClick={() => approvaTurno(t.id)}>
                  Approva
                </button>{" "}
                <button className="btn" onClick={() => rifiutaTurno(t.id)}>
                  Rifiuta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
