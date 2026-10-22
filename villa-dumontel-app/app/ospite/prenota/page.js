"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import FormRichiesta from "../../components/FormRichiesta";

const TIPI_VALIDI = ["trasporto", "ristorante", "attivita", "pulizie"];
const ANNULLABILI = ["nuova", "in gestione", "confermata"];

export default function PrenotaOspitePage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [profilo, setProfilo] = useState(null);
  const [alloggi, setAlloggi] = useState([]);
  const [posti, setPosti] = useState([]);
  const [richieste, setRichieste] = useState([]);
  const [iniziale, setIniziale] = useState({ tipo: "ristorante", nome: "" });
  const [inviata, setInviata] = useState(false);
  const [errore, setErrore] = useState(null);

  async function caricaRichieste(famiglia_id) {
    const { data } = await supabase
      .from("richieste")
      .select("*")
      .eq("famiglia_id", famiglia_id)
      .order("id", { ascending: false });
    setRichieste(data || []);
  }

  useEffect(() => {
    async function carica() {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tipo");
      setIniziale({
        tipo: t && TIPI_VALIDI.includes(t) ? t : "ristorante",
        nome: params.get("nome") || "",
      });

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
      setProfilo(p);

      const { data: alloggiData } = await supabase
        .from("alloggi")
        .select("*")
        .eq("famiglia_id", p.famiglia_id);
      setAlloggi(alloggiData || []);

      const { data: postiData } = await supabase
        .from("posti")
        .select("id, nome, categoria, sotto_categoria")
        .in("categoria", ["ristorante", "attivita"])
        .order("id", { ascending: true });
      setPosti(postiData || []);

      await caricaRichieste(p.famiglia_id);
      setCaricamento(false);
    }

    carica();
  }, []);

  async function invia(valori) {
    setInviata(false);
    setErrore(null);
    const { error } = await supabase.from("richieste").insert({
      ...valori,
      famiglia_id: profilo.famiglia_id,
      stato: "nuova",
    });
    if (error) return "Errore: " + error.message;
    setInviata(true);
    await caricaRichieste(profilo.famiglia_id);
    return null;
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
    await caricaRichieste(profilo.famiglia_id);
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
        <a href="/ospite">&larr; Home</a>
      </p>
      <h1>Prenota</h1>

      {inviata && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p>Richiesta inviata. Ti risponderemo al pi&ugrave; presto.</p>
        </div>
      )}
      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <FormRichiesta
          key={iniziale.tipo + iniziale.nome + posti.length}
          alloggi={alloggi}
          posti={posti}
          tipoIniziale={iniziale.tipo}
          nomeIniziale={iniziale.nome}
          onSubmit={invia}
          etichettaBottone="Invia richiesta"
        />
      </div>

      <h2>Le mie richieste</h2>
      <div className="card">
        {richieste.length === 0 && <p className="muted">Nessuna richiesta.</p>}
        {richieste.map((r) => (
          <div key={r.id} className="richiesta-item">
            <span className={"badge badge-" + String(r.stato).replace(" ", "-")}>
              {r.stato}
            </span>{" "}
            <strong>{r.tipo}</strong>
            <p className="descrizione">
              {r.data || ""} {r.ora ? String(r.ora).slice(0, 5) : ""}{" "}
              {r.sotto_tipo ? `— ${r.sotto_tipo}` : ""}{" "}
              {r.descrizione ? `— ${r.descrizione}` : ""}
              {r.pax ? ` (${r.pax} pers.)` : ""}
            </p>
            {ANNULLABILI.includes(r.stato) && (
              <div className="stato-actions">
                <button onClick={() => annulla(r.id)}>Annulla richiesta</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
