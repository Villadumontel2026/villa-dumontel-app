"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const CHECKLIST_PULIZIE = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

const TIPI_VALIDI = ["trasporto", "ristorante", "attivita", "pulizie"];

export default function PrenotaOspitePage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [profilo, setProfilo] = useState(null);
  const [alloggi, setAlloggi] = useState([]);
  const [richieste, setRichieste] = useState([]);
  const [tipo, setTipo] = useState("ristorante");
  const [nome, setNome] = useState("");
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
      if (t && TIPI_VALIDI.includes(t)) setTipo(t);
      if (params.get("nome")) setNome(params.get("nome"));

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

      await caricaRichieste(p.famiglia_id);
      setCaricamento(false);
    }

    carica();
  }, []);

  async function invia(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const val = (n) => (f[n] && f[n].value ? f[n].value : null);

    let note = val("note");
    if (tipo === "pulizie") {
      const voci = Array.from(f.querySelectorAll('input[name="voci"]:checked')).map(
        (c) => c.value
      );
      if (voci.length) {
        note = "Servizi: " + voci.join(", ") + (note ? " — " + note : "");
      }
    }

    const { error } = await supabase.from("richieste").insert({
      famiglia_id: profilo.famiglia_id,
      alloggio_id: val("alloggio_id"),
      tipo,
      sotto_tipo: val("sotto_tipo"),
      data: val("data"),
      ora: val("ora"),
      pax: val("pax") ? parseInt(val("pax"), 10) : null,
      descrizione: val("descrizione"),
      note,
      stato: "nuova",
    });

    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    f.reset();
    setNome("");
    setInviata(true);
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
        <form onSubmit={invia} key={tipo + nome}>
          <label>
            Cosa desideri prenotare
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                setNome("");
                setInviata(false);
              }}
            >
              <option value="ristorante">Ristorante</option>
              <option value="attivita">Attivit&agrave;</option>
              <option value="trasporto">Trasporto</option>
              <option value="pulizie">Pulizie</option>
            </select>
          </label>

          <label>
            Alloggio
            <select name="alloggio_id" required>
              {alloggi.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>

          {tipo === "trasporto" && (
            <>
              <label>
                Direzione
                <select name="sotto_tipo">
                  <option value="andata">Arrivo in valle</option>
                  <option value="ritorno">Verso aeroporto</option>
                </select>
              </label>
              <label>
                Data
                <input type="date" name="data" />
              </label>
              <label>
                Orario volo
                <input type="time" name="ora" />
              </label>
              <label>
                Numero passeggeri
                <input type="number" name="pax" min="1" />
              </label>
              <label>
                Aeroporto / luogo
                <input type="text" name="descrizione" placeholder="es. Malpensa T1 -> Courmayeur" />
              </label>
            </>
          )}

          {tipo === "ristorante" && (
            <>
              <label>
                Pasto
                <select name="sotto_tipo">
                  <option value="pranzo">Pranzo</option>
                  <option value="cena">Cena</option>
                </select>
              </label>
              <label>
                Data
                <input type="date" name="data" />
              </label>
              <label>
                Ora
                <input type="time" name="ora" />
              </label>
              <label>
                Numero persone
                <input type="number" name="pax" min="1" />
              </label>
              <label>
                Ristorante
                <input
                  type="text"
                  name="descrizione"
                  defaultValue={nome}
                  placeholder="lascia vuoto per un consiglio"
                />
              </label>
            </>
          )}

          {tipo === "attivita" && (
            <>
              <label>
                Tipo di attivit&agrave;
                <input type="text" name="sotto_tipo" placeholder="es. sci, escursione, spa" />
              </label>
              <label>
                Data
                <input type="date" name="data" />
              </label>
              <label>
                Numero partecipanti
                <input type="number" name="pax" min="1" />
              </label>
              <label>
                Dettagli
                <input
                  type="text"
                  name="descrizione"
                  defaultValue={nome}
                  placeholder="es. nome del posto, livello, orario preferito"
                />
              </label>
            </>
          )}

          {tipo === "pulizie" && (
            <>
              <label>
                Data desiderata
                <input type="date" name="data" />
              </label>
              <label>Cosa serve</label>
              {CHECKLIST_PULIZIE.map((voce) => (
                <label
                  key={voce}
                  style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <input
                    type="checkbox"
                    name="voci"
                    value={voce}
                    style={{ width: "auto", marginBottom: 0 }}
                  />
                  {voce}
                </label>
              ))}
            </>
          )}

          <label>
            Note
            <textarea name="note"></textarea>
          </label>

          <button type="submit" className="btn">
            Invia richiesta
          </button>
        </form>
      </div>

      <h2>Le mie richieste</h2>
      <div className="card">
        {richieste.length === 0 && <p className="muted">Nessuna richiesta.</p>}
        {richieste.map((r) => (
          <div key={r.id} className="richiesta-item">
            <span className={"badge badge-" + String(r.stato).replace(" ", "-")}>{r.stato}</span>{" "}
            <strong>{r.tipo}</strong>
            <p className="descrizione">
              {r.data || ""} {r.ora ? String(r.ora).slice(0, 5) : ""}{" "}
              {r.sotto_tipo ? `— ${r.sotto_tipo}` : ""}{" "}
              {r.descrizione ? `— ${r.descrizione}` : ""}
              {r.pax ? ` (${r.pax} pers.)` : ""}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
