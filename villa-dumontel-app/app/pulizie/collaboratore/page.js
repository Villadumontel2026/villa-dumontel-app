"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import CalendarButton from "../../components/CalendarButton";

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
  const [richieste, setRichieste] = useState([]);
  const [collabId, setCollabId] = useState(null);
  const [msg, setMsg] = useState(null);

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
      setCollabId(profilo.collaboratore_id);

      const { data: ric } = await supabase
        .from("richieste")
        .select("*, alloggi(nome)")
        .eq("tipo", "pulizie")
        .eq("collaboratore_id", profilo.collaboratore_id)
        .in("stato", ["nuova", "in gestione", "confermata"])
        .order("data", { ascending: true });
      setRichieste(ric || []);

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

  async function ricaricaRichieste() {
    const { data: ric } = await supabase
      .from("richieste")
      .select("*, alloggi(nome)")
      .eq("tipo", "pulizie")
      .eq("collaboratore_id", collabId)
      .in("stato", ["nuova", "in gestione", "confermata"])
      .order("data", { ascending: true });
    setRichieste(ric || []);
  }

  // Accetta l'incarico (puo' correggere la durata): la richiesta diventa prenotata
  async function accetta(r, durata) {
    setMsg(null);
    const ore = parseFloat(durata);
    if (!ore || ore <= 0) {
      setMsg("Indica la durata in ore.");
      return;
    }
    const { error } = await supabase
      .from("richieste")
      .update({ durata_ore: ore, accettata_il: new Date().toISOString(), stato: "confermata" })
      .eq("id", r.id);
    if (error) {
      setMsg("Errore: " + error.message);
      return;
    }
    await ricaricaRichieste();
    setMsg("Incarico accettato.");
  }

  async function convalida(r, durata) {
    setMsg(null);
    const ore = parseFloat(durata);
    if (!ore || ore <= 0) {
      setMsg("Indica la durata in ore.");
      return;
    }
    const { error: errTurno } = await supabase.from("turni_pulizia").insert({
      collaboratore_id: collabId,
      alloggio_id: r.alloggio_id,
      data: r.data,
      ore,
      note: r.descrizione || null,
      importo_dovuto: ore * (collaboratore?.tariffa_oraria || 15),
      stato: "da approvare",
    });
    if (errTurno) {
      setMsg("Errore: " + errTurno.message);
      return;
    }
    const { error } = await supabase
      .from("richieste")
      .update({ durata_ore: ore, convalidata_il: new Date().toISOString(), stato: "completata" })
      .eq("id", r.id);
    if (error) {
      setMsg("Turno inviato, ma la richiesta non si e' chiusa: " + error.message);
      return;
    }
    await ricaricaRichieste();
    window.location.reload();
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
            <a href="/login" className="btn">Vai al login</a>
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

      {richieste.filter((r) => !r.accettata_il).length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>Da accettare</h2>
          {msg && <p className="muted">{msg}</p>}
          {richieste
            .filter((r) => !r.accettata_il)
            .map((r) => (
              <div key={r.id} className="richiesta-item">
                <span className="badge badge-nuova">da accettare</span>{" "}
                <strong>{r.alloggi?.nome}</strong> &mdash; {r.data}{" "}
                {r.ora ? String(r.ora).slice(0, 5) : ""}
                {r.descrizione && <p className="descrizione">Da fare: {r.descrizione}</p>}
                {r.note && <p className="descrizione">Note: {r.note}</p>}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    accetta(r, e.target.durata.value);
                  }}
                  style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
                >
                  <label style={{ margin: 0, fontWeight: 400 }}>
                    Durata prevista (ore){" "}
                    <input
                      type="number"
                      name="durata"
                      min="0.5"
                      max="12"
                      step="0.5"
                      defaultValue={r.durata_ore || ""}
                      required
                      style={{ width: "5rem", marginBottom: 0 }}
                    />
                  </label>
                  <button type="submit" className="btn">
                    Accetta
                  </button>
                </form>
              </div>
            ))}
        </div>
      )}

      {richieste.filter((r) => r.accettata_il).length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>Pulizie in programma</h2>
          {richieste
            .filter((r) => r.accettata_il)
            .map((r) => (
              <div key={r.id} className="richiesta-item">
                <strong>{r.alloggi?.nome}</strong> &mdash; {r.data}{" "}
                {r.ora ? String(r.ora).slice(0, 5) : ""}
                {r.durata_ore ? ` — previste ${r.durata_ore} ore` : ""}
                {r.descrizione && <p className="descrizione">Da fare: {r.descrizione}</p>}
                {r.note && <p className="descrizione">Note: {r.note}</p>}
                <div style={{ margin: "0.5rem 0" }}>
                  <CalendarButton richiesta={r} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    convalida(r, e.target.durata.value);
                  }}
                  style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
                >
                  <label style={{ margin: 0, fontWeight: 400 }}>
                    Durata effettiva (ore){" "}
                    <input
                      type="number"
                      name="durata"
                      min="0.5"
                      max="12"
                      step="0.5"
                      defaultValue={r.durata_ore || ""}
                      required
                      style={{ width: "5rem", marginBottom: 0 }}
                    />
                  </label>
                  <button type="submit" className="btn">
                    Pulizia fatta: conferma
                  </button>
                </form>
              </div>
            ))}
        </div>
      )}

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
