"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import CalendarButton from "../../components/CalendarButton";

const ANNULLABILI = ["nuova", "in gestione", "confermata"];

const CHECKLIST_PULIZIE = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

const ETICHETTE_TIPO = {
  trasporto: "Trasporto",
  ristorante: "Ristorante",
  attivita: "Attività",
  pulizie: "Pulizie",
};

function etichettaStato(stato) {
  if (stato === "nuova" || stato === "in gestione") return "Inviata";
  if (stato === "confermata") return "Prenotata";
  if (stato === "completata") return "Completata";
  if (stato === "annullata") return "Annullata";
  return stato;
}

export default function RichiesteOspitePage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famigliaId, setFamigliaId] = useState(null);
  const [richieste, setRichieste] = useState([]);
  const [errore, setErrore] = useState(null);

  async function carica(famiglia_id) {
    const { data } = await supabase
      .from("richieste")
      .select("*")
      .eq("famiglia_id", famiglia_id)
      .order("data", { ascending: true });
    setRichieste(data || []);
  }

  useEffect(() => {
    async function inizia() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErroreAccesso("Devi accedere per vedere questa pagina.");
        setCaricamento(false);
        return;
      }

      const { data: p } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!p || p.ruolo !== "ospite" || !p.famiglia_id) {
        setErroreAccesso("Questa pagina e' riservata agli ospiti.");
        setCaricamento(false);
        return;
      }

      setFamigliaId(p.famiglia_id);
      await carica(p.famiglia_id);
      setCaricamento(false);
    }
    inizia();
  }, []);

  async function salvaCosaFare(e, r) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const voci = Array.from(f.querySelectorAll('input[name="voci"]:checked')).map((c) => c.value);
    const { error } = await supabase
      .from("richieste")
      .update({ descrizione: voci.length ? voci.join(", ") : null, note: f.note.value || null })
      .eq("id", r.id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await carica(famigliaId);
  }

  async function annulla(id) {
    if (!window.confirm("Vuoi annullare questa richiesta?")) return;
    setErrore(null);
    const { error } = await supabase
      .from("richieste")
      .update({ stato: "annullata" })
      .eq("id", id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await carica(famigliaId);
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

  const inCorso = richieste.filter((r) => ANNULLABILI.includes(r.stato));
  const chiuse = richieste
    .filter((r) => !ANNULLABILI.includes(r.stato))
    .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  function riga(r) {
    return (
      <div key={r.id} className="richiesta-item">
        <span
          className={
            "badge " +
            (r.stato === "confermata"
              ? "badge-confermata"
              : r.stato === "completata"
              ? "badge-completata"
              : "badge-nuova")
          }
        >
          {etichettaStato(r.stato)}
        </span>{" "}
        <strong>{ETICHETTE_TIPO[r.tipo] || r.tipo}</strong>
        <p className="descrizione">
          {r.data || ""} {r.ora ? String(r.ora).slice(0, 5) : ""}
          {r.sotto_tipo ? ` — ${r.sotto_tipo}` : ""}
          {r.descrizione ? ` — ${r.descrizione}` : ""}
          {r.pax ? ` (${r.pax} pers.)` : ""}
          {r.durata_ore ? ` — durata ${r.durata_ore} ore` : ""}
          {r.tipo === "pulizie" && r.note ? ` — ${r.note}` : ""}
          {r.tipo === "pulizie" && r.accettata_il ? " — accettata dalla collaboratrice" : ""}
        </p>
        {r.tipo === "pulizie" && ANNULLABILI.includes(r.stato) && (
          <details style={{ margin: "0.5rem 0" }}>
            <summary style={{ cursor: "pointer" }}>Indica cosa fare</summary>
            <form onSubmit={(e) => salvaCosaFare(e, r)} style={{ marginTop: "0.5rem" }}>
              {CHECKLIST_PULIZIE.map((voce) => (
                <label
                  key={voce}
                  style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <input
                    type="checkbox"
                    name="voci"
                    value={voce}
                    defaultChecked={String(r.descrizione || "").includes(voce)}
                    style={{ width: "auto", marginBottom: 0 }}
                  />
                  {voce}
                </label>
              ))}
              <label>
                Note per chi fa le pulizie
                <textarea name="note" defaultValue={r.note || ""}></textarea>
              </label>
              <button type="submit" className="btn">
                Salva
              </button>
            </form>
          </details>
        )}
        {ANNULLABILI.includes(r.stato) && (
          <div className="stato-actions">
            {(r.stato === "confermata" || r.tipo === "pulizie") && <CalendarButton richiesta={r} />}{" "}
            <button onClick={() => annulla(r.id)}>Annulla richiesta</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main>
      <h1>Le mie richieste</h1>

      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/ospite/prenota" className="btn">
          Prenota
        </a>
      </p>

      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}

      <h2>In corso</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {inCorso.length === 0 && <p className="muted">Nessuna richiesta in corso.</p>}
        {inCorso.map(riga)}
      </div>

      {chiuse.length > 0 && (
        <details className="card">
          <summary className="muted" style={{ cursor: "pointer" }}>
            Completate e annullate ({chiuse.length})
          </summary>
          <div style={{ marginTop: "0.75rem" }}>{chiuse.map(riga)}</div>
        </details>
      )}
    </main>
  );
}
