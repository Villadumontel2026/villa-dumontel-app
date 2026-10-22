"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import FormRichiesta from "../components/FormRichiesta";

const STATI = ["nuova", "in gestione", "confermata", "completata", "annullata"];

function classeBadge(stato) {
  return "badge badge-" + String(stato).replace(" ", "-");
}

export default function RichiestePage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [richieste, setRichieste] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
  const [posti, setPosti] = useState([]);
  const [errore, setErrore] = useState(null);

  async function caricaRichieste() {
    const { data } = await supabase
      .from("richieste")
      .select("*, alloggi(nome), famiglie(nome)")
      .order("data", { ascending: true });
    setRichieste(data || []);
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

      const { data: alloggiData } = await supabase.from("alloggi").select("*");
      setAlloggi(alloggiData || []);
      const { data: postiData } = await supabase
        .from("posti")
        .select("id, nome, categoria, sotto_categoria")
        .in("categoria", ["ristorante", "attivita"])
        .order("id", { ascending: true });
      setPosti(postiData || []);
      await caricaRichieste();
      setCaricamento(false);
    }

    carica();
  }, []);

  async function cambiaStato(id, stato) {
    const { error } = await supabase.from("richieste").update({ stato }).eq("id", id);
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    await caricaRichieste();
  }

  async function creaRichiesta(valori) {
    setErrore(null);
    const alloggio = alloggi.find((a) => String(a.id) === String(valori.alloggio_id));
    const { error } = await supabase.from("richieste").insert({
      ...valori,
      famiglia_id: alloggio?.famiglia_id || null,
      stato: "nuova",
    });
    if (error) return "Errore: " + error.message;
    await caricaRichieste();
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
            <a href="/login">Vai al login &rarr;</a>
          </p>
        </div>
      </main>
    );
  }

  const gruppi = { nuova: [], "in gestione": [], confermata: [], completata: [], annullata: [] };
  richieste.forEach((r) => {
    const key = gruppi[r.stato] ? r.stato : "nuova";
    gruppi[key].push(r);
  });

  return (
    <main>
      <p>
        <a href="/">&larr; Home</a>
      </p>
      <h1>Richieste</h1>

      <p>
        <a href="/pulizie/admin">Vai a Pulizie (gestione) &rarr;</a>
      </p>
      <p>
        <a href="/spese/admin">Vai a Spese generiche &rarr;</a>
      </p>
      <p>
        <a href="/riepilogo">Vai al Riepilogo &rarr;</a>
      </p>

      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2>Nuova richiesta</h2>
        <FormRichiesta
          alloggi={alloggi}
          posti={posti}
          tipoIniziale="trasporto"
          onSubmit={creaRichiesta}
          etichettaBottone="Aggiungi richiesta"
        />
      </div>

      {Object.entries(gruppi).map(([stato, items]) => (
        <section key={stato} style={{ marginBottom: "1.75rem" }}>
          <h2>
            {stato}{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              ({items.length})
            </span>
          </h2>

          {items.length === 0 && <p className="muted">Nessuna richiesta.</p>}

          {items.length > 0 && (
            <div className="card">
              {items.map((r) => (
                <div key={r.id} className="richiesta-item">
                  <span className={classeBadge(r.stato)}>{r.tipo}</span>{" "}
                  <strong>{r.alloggi?.nome}</strong> &mdash; {r.famiglie?.nome}
                  <p className="descrizione">
                    {r.data} {r.ora} &mdash;{" "}
                    {r.sotto_tipo ? `${r.sotto_tipo} — ` : ""}
                    {r.descrizione}
                    {r.note ? ` (${r.note})` : ""}
                  </p>
                  <div className="stato-actions">
                    {STATI.filter((s) => s !== r.stato).map((s) => (
                      <button key={s} onClick={() => cambiaStato(r.id, s)}>
                        {s === "annullata" ? "Annulla" : "→ " + s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
