"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import PopupScheda from "./PopupEvento";
import { Cestino } from "./IconeAzione";

const dmy = (s) => {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
};
const oggiIso = () => new Date().toISOString().slice(0, 10);
const punti = (t) => (t.todo_voci || []).slice().sort((a, b) => (a.ordine || 0) - (b.ordine || 0) || a.id - b.id);
const completo = (t) => punti(t).length > 0 && punti(t).every((p) => p.fatto);

let chiave = 0;
const nuovaChiave = () => "k" + ++chiave;

// Modulo di un To Do (nuovo o da modificare): intestazione + elenco di punti, ognuno collegabile a una collaboratrice.
export function FormTodo({ alloggi, collaboratori, todo = null, onFatto }) {
  const [errore, setErrore] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const [elenco, setElenco] = useState(() => {
    const esistenti = todo ? punti(todo) : [];
    return esistenti.length
      ? esistenti.map((p) => ({ k: nuovaChiave(), id: p.id, testo: p.testo, collaboratore_id: p.collaboratore_id ? String(p.collaboratore_id) : "" }))
      : [{ k: nuovaChiave(), id: null, testo: "", collaboratore_id: "" }];
  });

  const cambia = (k, campo, valore) => setElenco((l) => l.map((p) => (p.k === k ? { ...p, [campo]: valore } : p)));

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const testata = {
      alloggio_id: parseInt(f.alloggio_id.value, 10),
      titolo: f.titolo.value.trim(),
      note: f.note.value.trim() || null,
      scadenza: f.scadenza.value || null,
    };
    if (!testata.titolo || !testata.alloggio_id) return setErrore("Indica l'appartamento e un titolo.");
    const righe = elenco.map((p) => ({ ...p, testo: p.testo.trim() })).filter((p) => p.testo);
    if (righe.length === 0) return setErrore("Aggiungi almeno un punto da fare.");

    setOccupato(true);
    let id = todo ? todo.id : null;
    if (todo) {
      const { error } = await supabase.from("todo_alloggio").update(testata).eq("id", id);
      if (error) {
        setOccupato(false);
        return setErrore("Errore: " + error.message);
      }
    } else {
      const { data, error } = await supabase.from("todo_alloggio").insert(testata).select("id").single();
      if (error) {
        setOccupato(false);
        return setErrore("Errore: " + error.message);
      }
      id = data.id;
    }

    // punti tolti dal modulo
    if (todo) {
      const rimasti = righe.filter((p) => p.id).map((p) => p.id);
      const tolti = punti(todo).filter((p) => !rimasti.includes(p.id)).map((p) => p.id);
      if (tolti.length) {
        const { error } = await supabase.from("todo_voci").delete().in("id", tolti);
        if (error) {
          setOccupato(false);
          return setErrore("Errore: " + error.message);
        }
      }
    }
    // punti nuovi e modificati
    for (let i = 0; i < righe.length; i++) {
      const p = righe[i];
      const dati = { testo: p.testo, ordine: i + 1, collaboratore_id: p.collaboratore_id ? parseInt(p.collaboratore_id, 10) : null };
      const { error } = p.id
        ? await supabase.from("todo_voci").update(dati).eq("id", p.id)
        : await supabase.from("todo_voci").insert({ ...dati, todo_id: id });
      if (error) {
        setOccupato(false);
        return setErrore("Errore: " + error.message);
      }
    }
    setOccupato(false);
    if (!todo) {
      f.reset();
      setElenco([{ k: nuovaChiave(), id: null, testo: "", collaboratore_id: "" }]);
    }
    if (onFatto) await onFatto();
  }

  return (
    <form onSubmit={salva}>
      <label>
        Appartamento
        <select name="alloggio_id" required defaultValue={todo ? todo.alloggio_id : ""}>
          <option value="">— scegli —</option>
          {alloggi.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Titolo
        <input type="text" name="titolo" required defaultValue={todo ? todo.titolo : ""} placeholder="es. Prima dell'arrivo di Karen" />
      </label>
      <label>
        Scadenza (facoltativa)
        <input type="date" name="scadenza" defaultValue={todo ? todo.scadenza || "" : ""} />
      </label>

      <p style={{ margin: "0 0 0.3rem", fontWeight: 600 }}>Cosa controllare o fare</p>
      {elenco.map((p) => (
        <div key={p.k} style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <input
            type="text"
            value={p.testo}
            onChange={(e) => cambia(p.k, "testo", e.target.value)}
            placeholder="Un punto da fare"
            style={{ flex: "1 1 14rem", marginBottom: 0 }}
          />
          <select
            value={p.collaboratore_id}
            onChange={(e) => cambia(p.k, "collaboratore_id", e.target.value)}
            style={{ width: "auto", marginBottom: 0 }}
            aria-label="Collega a una collaboratrice"
          >
            <option value="">Solo io</option>
            {collaboratori.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-light"
            aria-label="Togli il punto"
            onClick={() => setElenco((l) => (l.length > 1 ? l.filter((x) => x.k !== p.k) : l))}
          >
            ×
          </button>
        </div>
      ))}
      <p style={{ margin: "0 0 1rem" }}>
        <button type="button" className="btn btn-light" onClick={() => setElenco((l) => [...l, { k: nuovaChiave(), id: null, testo: "", collaboratore_id: "" }])}>
          + Aggiungi un punto
        </button>
      </p>

      <label>
        Note (facoltative)
        <textarea name="note" defaultValue={todo ? todo.note || "" : ""}></textarea>
      </label>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
      <button type="submit" className="btn" disabled={occupato}>
        {todo ? "Salva" : "Crea il To Do"}
      </button>
    </form>
  );
}

// Elenco dei To Do. Un clic apre la scheda con i punti da spuntare; la matita apre la modifica completa.
export function ListaTodo({ todo, alloggi, collaboratori, onCambiato }) {
  const [apriId, setApriId] = useState(null);
  const [modifica, setModifica] = useState(false);
  const [errore, setErrore] = useState(null);
  const oggi = oggiIso();

  const nomeAlloggio = (id) => (alloggi.find((a) => a.id === id) || {}).nome || "";
  const nomeCollab = (id) => (collaboratori.find((c) => c.id === id) || {}).nome || "";
  const daFare = todo
    .filter((x) => !completo(x))
    .sort((a, b) => String(a.scadenza || "9999").localeCompare(String(b.scadenza || "9999")));
  const fatti = todo.filter((x) => completo(x)).sort((a, b) => String(b.scadenza || "").localeCompare(String(a.scadenza || "")));

  async function spunta(p, fatto) {
    setErrore(null);
    const { error } = await supabase
      .from("todo_voci")
      .update({ fatto, fatto_il: fatto ? new Date().toISOString() : null, fatto_da: fatto ? "admin" : null, fatto_nota: fatto ? p.fatto_nota || null : null })
      .eq("id", p.id);
    if (error) return setErrore("Errore: " + error.message);
    if (onCambiato) await onCambiato();
  }

  async function elimina(x) {
    if (!window.confirm("Eliminare questo To Do con tutti i suoi punti?")) return;
    const { error } = await supabase.from("todo_alloggio").delete().eq("id", x.id);
    if (error) return setErrore("Errore: " + error.message);
    setApriId(null);
    if (onCambiato) await onCambiato();
  }

  const colore = (x) => {
    if (completo(x) || !x.scadenza) return "transparent";
    const giorni = Math.round((new Date(x.scadenza) - new Date(oggi)) / 86400000);
    if (giorni < 0) return "#fde2e2";
    if (giorni <= 7) return "#fff6e0";
    return "transparent";
  };

  const riga = (x) => {
    const pp = punti(x);
    const fatte = pp.filter((p) => p.fatto).length;
    return (
      <div
        key={x.id}
        className="richiesta-item"
        style={{ background: colore(x), borderRadius: 8, padding: "0.5rem", cursor: "pointer" }}
        onClick={() => {
          setApriId(x.id);
          setModifica(false);
        }}
      >
        <strong>{x.titolo}</strong>{" "}
        <span className="muted">
          ({fatte}/{pp.length})
        </span>
        <p className="descrizione" style={{ margin: "0.15rem 0" }}>
          {nomeAlloggio(x.alloggio_id)}
          {x.scadenza ? ` — entro il ${dmy(x.scadenza)}` : ""}
        </p>
      </div>
    );
  };

  const aperto = apriId ? todo.find((x) => x.id === apriId) : null;

  return (
    <div>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
      {daFare.length === 0 && <p className="muted">Nessun To Do aperto.</p>}
      {daFare.map(riga)}
      {fatti.length > 0 && (
        <details style={{ marginTop: "1rem" }}>
          <summary className="muted" style={{ cursor: "pointer" }}>
            Completati ({fatti.length})
          </summary>
          <div style={{ marginTop: "0.5rem" }}>{fatti.map(riga)}</div>
        </details>
      )}

      {aperto && (
        <PopupScheda
          titolo={aperto.titolo}
          sottotitolo={[nomeAlloggio(aperto.alloggio_id), aperto.scadenza ? "entro il " + dmy(aperto.scadenza) : ""].filter(Boolean).join(" · ")}
          onChiudi={() => {
            setApriId(null);
            setModifica(false);
          }}
          azioneModifica={modifica ? null : { onClick: () => setModifica(true) }}
          larga={modifica}
        >
          {modifica ? (
            <FormTodo
              alloggi={alloggi}
              collaboratori={collaboratori}
              todo={aperto}
              onFatto={async () => {
                setModifica(false);
                if (onCambiato) await onCambiato();
              }}
            />
          ) : (
            <div>
              {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
              {punti(aperto).map((p) => (
                <label
                  key={p.id}
                  style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontWeight: 400, margin: "0 0 0.7rem" }}
                >
                  <input
                    type="checkbox"
                    checked={!!p.fatto}
                    onChange={(e) => spunta(p, e.target.checked)}
                    style={{ width: "auto", marginTop: "0.25rem", marginBottom: 0 }}
                  />
                  <span style={{ opacity: p.fatto ? 0.6 : 1 }}>
                    <span style={{ textDecoration: p.fatto ? "line-through" : "none" }}>{p.testo}</span>
                    {p.collaboratore_id && (
                      <span className="muted" style={{ fontSize: "0.85em" }}>
                        {" "}
                        → {nomeCollab(p.collaboratore_id) || "collaboratrice"}
                      </span>
                    )}
                    {p.fatto && p.fatto_da === "collaboratore" && (
                      <span className="muted" style={{ fontSize: "0.85em" }}>
                        {" "}
                        · fatto da lei{p.fatto_il ? " il " + dmy(String(p.fatto_il).slice(0, 10)) : ""}
                        {p.fatto_nota ? " — " + p.fatto_nota : ""}
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {punti(aperto).length === 0 && <p className="muted">Nessun punto: aggiungili dalla matita.</p>}
              {aperto.note && (
                <div style={{ marginTop: "0.8rem", background: "#faf7ef", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
                  <strong style={{ fontSize: "0.88em" }}>Note</strong>
                  <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{aperto.note}</p>
                </div>
              )}
              <p style={{ marginTop: "0.8rem" }}>
                <Cestino onClick={() => elimina(aperto)} titolo="Elimina il To Do" />
              </p>
            </div>
          )}
        </PopupScheda>
      )}
    </div>
  );
}
