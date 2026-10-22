"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const STATI = ["nuova", "in gestione", "confermata", "completata"];

const CHECKLIST_PULIZIE = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

function classeBadge(stato) {
  return "badge badge-" + String(stato).replace(" ", "-");
}

export default function RichiestePage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [richieste, setRichieste] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
  const [tipo, setTipo] = useState("trasporto");
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

  async function creaRichiesta(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const val = (n) => (f[n] && f[n].value ? f[n].value : null);

    let descrizione = val("descrizione") || "";
    const voci = Array.from(f.querySelectorAll('input[name="voci"]:checked')).map(
      (c) => c.value
    );
    if (voci.length > 0) descrizione = voci.join(", ");

    const alloggioId = val("alloggio_id");
    const alloggio = alloggi.find((a) => String(a.id) === String(alloggioId));

    const { error } = await supabase.from("richieste").insert({
      tipo,
      alloggio_id: alloggioId,
      famiglia_id: alloggio?.famiglia_id || null,
      data: val("data"),
      ora: val("ora"),
      sotto_tipo: val("sotto_tipo"),
      pax: val("pax") ? parseInt(val("pax"), 10) : null,
      descrizione,
      note: val("note"),
      stato: "nuova",
    });

    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    f.reset();
    await caricaRichieste();
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

  const gruppi = { nuova: [], "in gestione": [], confermata: [], completata: [] };
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
        <form onSubmit={creaRichiesta} key={tipo}>
          <label>
            Tipo di richiesta
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="trasporto">Trasporto</option>
              <option value="ristorante">Ristorante</option>
              <option value="attivita">Attivit&agrave;</option>
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
                <input type="number" name="pax" />
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
                <input type="number" name="pax" />
              </label>
              <label>
                Ristorante preferito
                <input type="text" name="descrizione" placeholder="lascia vuoto per un consiglio" />
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
                <input type="number" name="pax" />
              </label>
              <label>
                Dettagli
                <input type="text" name="descrizione" placeholder="es. livello, orario preferito" />
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
            Aggiungi richiesta
          </button>
        </form>
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
                        &rarr; {s}
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
