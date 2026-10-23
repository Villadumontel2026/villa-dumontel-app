"use client";

import { useState } from "react";

const CHECKLIST_PULIZIE = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

const DIREZIONI = [
  "Malpensa T1 → Courmayeur",
  "Malpensa T2 → Courmayeur",
  "Courmayeur → Malpensa T1",
  "Courmayeur → Malpensa T2",
];

const ALTRO = "__altro__";

function raggruppa(posti) {
  const g = {};
  posti.forEach((p) => {
    const k = p.sotto_categoria || "Altro";
    if (!g[k]) g[k] = [];
    g[k].push(p);
  });
  return g;
}

// Props:
//  alloggi, posti [{id, nome, categoria, sotto_categoria}]
//  tipoIniziale, nomeIniziale (per i pulsanti "Prenota" delle pagine Info)
//  onSubmit(valori) -> Promise che ritorna un messaggio di errore oppure null
//  etichettaBottone
export default function FormRichiesta({
  alloggi,
  posti = [],
  collaboratori = null,
  tipoIniziale = "ristorante",
  nomeIniziale = "",
  onSubmit,
  etichettaBottone = "Invia richiesta",
}) {
  const [tipo, setTipo] = useState(tipoIniziale);
  const postiTipo = (t) => posti.filter((p) => p.categoria === t);

  const trovaIniziale = (t) => {
    if (!nomeIniziale || t !== tipoIniziale) return "";
    const p = postiTipo(t).find((x) => x.nome === nomeIniziale);
    if (p) return String(p.id);
    return nomeIniziale ? ALTRO : "";
  };

  const [posto, setPosto] = useState(trovaIniziale(tipoIniziale));
  const [direzione, setDirezione] = useState(DIREZIONI[0]);
  const [errore, setErrore] = useState(null);
  const [formKey, setFormKey] = useState(0);

  function cambiaTipo(t) {
    setTipo(t);
    setPosto(trovaIniziale(t));
    setErrore(null);
  }

  async function invia(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const val = (n) => (f[n] && f[n].value ? f[n].value : null);

    let sotto_tipo = val("sotto_tipo");
    let descrizione = null;
    let posto_id = null;

    if (tipo === "trasporto") {
      if (direzione === ALTRO) {
        sotto_tipo = "Altro";
        descrizione = val("altro_testo");
      } else {
        sotto_tipo = direzione;
      }
    } else if (tipo === "ristorante" || tipo === "attivita") {
      if (posto === ALTRO || !posto) {
        descrizione = val("altro_testo");
      } else {
        const p = posti.find((x) => String(x.id) === String(posto));
        posto_id = p ? p.id : null;
        descrizione = p ? p.nome : null;
      }
    } else if (tipo === "pulizie") {
      const voci = Array.from(
        f.querySelectorAll('input[name="voci"]:checked')
      ).map((c) => c.value);
      descrizione = voci.length ? voci.join(", ") : null;
    }

    const err = await onSubmit({
      tipo,
      alloggio_id: val("alloggio_id"),
      sotto_tipo,
      data: val("data"),
      ora: val("ora"),
      pax: val("pax") ? parseInt(val("pax"), 10) : null,
      durata_ore: tipo === "pulizie" && val("durata_ore") ? parseFloat(val("durata_ore")) : null,
      collaboratore_id: tipo === "pulizie" ? val("collaboratore_id") : null,
      descrizione,
      posto_id,
      note: val("note"),
    });

    if (err) {
      setErrore(err);
    } else {
      f.reset();
      setPosto("");
      setDirezione(DIREZIONI[0]);
      setFormKey((k) => k + 1);
    }
  }

  function selezionePosto(t, etichetta) {
    const gruppi = raggruppa(postiTipo(t));
    return (
      <>
        <label>
          {etichetta}
          <select value={posto} onChange={(e) => setPosto(e.target.value)}>
            <option value="">— scegli dalla lista —</option>
            {Object.keys(gruppi).map((g) => (
              <optgroup key={g} label={g}>
                {gruppi[g].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={ALTRO}>Altro (scrivo a mano)</option>
          </select>
        </label>
        {posto === ALTRO && (
          <label>
            Indica quale
            <input
              type="text"
              name="altro_testo"
              defaultValue={tipo === tipoIniziale ? nomeIniziale : ""}
              required
            />
          </label>
        )}
      </>
    );
  }

  return (
    <form onSubmit={invia} key={formKey}>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      <label>
        Cosa desideri prenotare
        <select value={tipo} onChange={(e) => cambiaTipo(e.target.value)}>
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
            <select
              value={direzione}
              onChange={(e) => setDirezione(e.target.value)}
            >
              {DIREZIONI.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={ALTRO}>Altro</option>
            </select>
          </label>
          {direzione === ALTRO && (
            <label>
              Indica la tratta
              <input type="text" name="altro_testo" required />
            </label>
          )}
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
        </>
      )}

      {tipo === "ristorante" && (
        <>
          {selezionePosto("ristorante", "Ristorante")}
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
        </>
      )}

      {tipo === "attivita" && (
        <>
          {selezionePosto("attivita", "Attività")}
          <label>
            Data
            <input type="date" name="data" />
          </label>
          <label>
            Ora
            <input type="time" name="ora" />
          </label>
          <label>
            Numero partecipanti
            <input type="number" name="pax" min="1" />
          </label>
        </>
      )}

      {tipo === "pulizie" && (
        <>
          <label>
            Data desiderata
            <input type="date" name="data" required />
          </label>
          <label>
            Ora di inizio
            <input type="time" name="ora" required />
          </label>
          {collaboratori && (
            <label>
              Collaboratrice (facoltativa)
              <select name="collaboratore_id" defaultValue="">
                <option value="">— da assegnare —</option>
                {collaboratori.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Durata prevista (ore)
            <input type="number" name="durata_ore" min="0.5" max="12" step="0.5" defaultValue="3" required />
          </label>
          <label>Cosa serve</label>
          {CHECKLIST_PULIZIE.map((voce) => (
            <label
              key={voce}
              style={{
                fontWeight: 400,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
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
        {etichettaBottone}
      </button>
    </form>
  );
}
