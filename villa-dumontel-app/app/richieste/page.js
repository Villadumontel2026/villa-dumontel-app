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

  const CATEGORIE = [
    { tipo: "trasporto", titolo: "Trasporti" },
    { tipo: "ristorante", titolo: "Ristoranti" },
    { tipo: "attivita", titolo: "Attività" },
    { tipo: "pulizie", titolo: "Pulizie" },
  ];
  const ORDINE_STATO = { nuova: 0, "in gestione": 1, confermata: 2 };
  const CHIUSE = ["completata", "annullata"];
  const perData = (x, y) => String(x.data || "9999").localeCompare(String(y.data || "9999"));

  const categorie = CATEGORIE.map((c) => {
    const tutte = richieste.filter((r) => r.tipo === c.tipo);
    const aperte = tutte
      .filter((r) => !CHIUSE.includes(r.stato))
      .sort((x, y) => (ORDINE_STATO[x.stato] ?? 0) - (ORDINE_STATO[y.stato] ?? 0) || perData(x, y));
    const chiuse = tutte.filter((r) => CHIUSE.includes(r.stato)).sort((x, y) => perData(y, x));
    const nuove = tutte.filter((r) => r.stato === "nuova").length;
    return { ...c, aperte, chiuse, nuove };
  });

  function riga(r) {
    return (
      <div key={r.id} className="richiesta-item">
        <span className={classeBadge(r.stato)}>{r.stato}</span>{" "}
        <strong>{r.alloggi?.nome}</strong> &mdash; {r.famiglie?.nome}
        <p className="descrizione">
          {r.data} {r.ora ? String(r.ora).slice(0, 5) : ""} &mdash;{" "}
          {r.sotto_tipo ? `${r.sotto_tipo} — ` : ""}
          {r.descrizione}
          {r.pax ? ` (${r.pax} pers.)` : ""}
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
    );
  }

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

      <details className="card" style={{ marginBottom: "2rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Nuova richiesta</summary>
        <div style={{ marginTop: "1rem" }}>
          <FormRichiesta
            alloggi={alloggi}
            posti={posti}
            tipoIniziale="trasporto"
            onSubmit={creaRichiesta}
            etichettaBottone="Aggiungi richiesta"
          />
        </div>
      </details>

      {categorie.map((c) => (
        <details
          key={c.tipo}
          open={c.aperte.length > 0}
          className="card"
          style={{ marginBottom: "1rem" }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "1.1em" }}>
            {c.titolo}{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              ({c.aperte.length} aperte
              {c.nuove > 0 ? `, ${c.nuove} nuove` : ""})
            </span>
          </summary>

          <div style={{ marginTop: "0.75rem" }}>
            {c.aperte.length === 0 && <p className="muted">Nessuna richiesta aperta.</p>}
            {c.aperte.map(riga)}

            {c.chiuse.length > 0 && (
              <details style={{ marginTop: "1rem" }}>
                <summary className="muted" style={{ cursor: "pointer" }}>
                  Completate e annullate ({c.chiuse.length})
                </summary>
                <div style={{ marginTop: "0.5rem" }}>{c.chiuse.map(riga)}</div>
              </details>
            )}
          </div>
        </details>
      ))}
    </main>
  );
}
