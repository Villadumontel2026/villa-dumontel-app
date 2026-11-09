"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";
import PopupScheda from "./PopupEvento";
import { Matita, Piu } from "./IconeAzione";

const oggi = () => new Date().toISOString().slice(0, 10);

function Campi({ posto = {}, gruppi = [], conGruppo, nuovoDefault }) {
  const id = "g" + (posto.id || "nuovo");
  return (
    <>
      <label>
        Nome
        <input type="text" name="nome" defaultValue={posto.nome || ""} required />
      </label>
      {conGruppo && (
        <label>
          Gruppo / zona (es. Entrèves, Courmayeur)
          <input type="text" name="sotto_categoria" list={id} defaultValue={posto.sotto_categoria || ""} />
          <datalist id={id}>
            {gruppi.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </label>
      )}
      <label>
        Sito web (facoltativo)
        <input type="text" name="sito_web" defaultValue={posto.sito_web || ""} />
      </label>
      <label>
        Descrizione — inglese
        <textarea name="perche" defaultValue={posto.perche || ""}></textarea>
      </label>
      <label>
        Descrizione — italiano
        <textarea name="perche_it" defaultValue={posto.perche_it || ""}></textarea>
      </label>
      <label>
        Quando andarci / consiglio — inglese (facoltativo)
        <input type="text" name="quando" defaultValue={posto.quando || ""} />
      </label>
      <label>
        Quando andarci / consiglio — italiano (facoltativo)
        <input type="text" name="quando_it" defaultValue={posto.quando_it || ""} />
      </label>
      <label>
        Indirizzo (facoltativo)
        <input type="text" name="indirizzo" defaultValue={posto.indirizzo || ""} />
      </label>
      {nuovoDefault !== undefined && (
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 400 }}>
          <input type="checkbox" name="nuovo" defaultChecked={nuovoDefault} style={{ width: "auto", marginBottom: 0 }} />
          Mostra l&apos;etichetta &quot;Nuovo&quot; per 3 mesi
        </label>
      )}
    </>
  );
}

function leggi(f, conGruppo) {
  const v = (n) => (f[n] && f[n].value ? f[n].value.trim() : null);
  return {
    nome: f.nome.value.trim(),
    sotto_categoria: conGruppo ? v("sotto_categoria") : null,
    sito_web: v("sito_web"),
    perche: v("perche"),
    perche_it: v("perche_it"),
    quando: v("quando"),
    quando_it: v("quando_it"),
    indirizzo: v("indirizzo"),
  };
}

// Strumenti per l'admin su ogni scheda: Nuovo on/off, Modifica, Elimina.
export function AdminPostoRiga({ posto, gruppi = [], conGruppo = false }) {
  const { ruolo } = useApp();
  const [errore, setErrore] = useState(null);
  if (ruolo !== "admin") return null;

  const giorni = posto.nuovo_dal ? (Date.now() - new Date(posto.nuovo_dal).getTime()) / 86400000 : null;
  const èNuovo = giorni !== null && giorni <= 92;

  async function toggleNuovo() {
    const { error } = await supabase
      .from("posti")
      .update({ nuovo_dal: èNuovo ? null : oggi() })
      .eq("id", posto.id);
    if (error) return setErrore("Errore: " + error.message);
    window.location.reload();
  }

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    const { error } = await supabase.from("posti").update(leggi(e.target, conGruppo)).eq("id", posto.id);
    if (error) return setErrore("Errore: " + error.message);
    window.location.reload();
  }

  async function elimina() {
    if (!window.confirm("Eliminare «" + posto.nome + "» dalla lista?")) return;
    const { error } = await supabase.from("posti").delete().eq("id", posto.id);
    if (error) return setErrore("Errore: " + error.message);
    window.location.reload();
  }

  return (
    <div
      style={{
        marginTop: "0.75rem",
        paddingTop: "0.6rem",
        borderTop: "1px dashed var(--color-border)",
      }}
    >
      <p className="muted" style={{ margin: "0 0 0.4rem", fontSize: "0.75rem" }}>
        Solo admin
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className={èNuovo ? "btn" : "btn btn-light"}
          style={{ padding: "0.3rem 0.8rem" }}
          onClick={toggleNuovo}
        >
          {èNuovo ? "Nuovo: attivo (togli)" : "Segna come nuovo"}
        </button>
        <button type="button" className="btn btn-light" style={{ padding: "0.3rem 0.8rem" }} onClick={elimina}>
          Elimina
        </button>
      </div>
      <details style={{ marginTop: "0.5rem" }}>
        <summary style={{ cursor: "pointer" }}>Modifica</summary>
        <form onSubmit={salva} style={{ marginTop: "0.5rem" }}>
          <Campi posto={posto} gruppi={gruppi} conGruppo={conGruppo} />
          <button type="submit" className="btn">
            Salva
          </button>
        </form>
      </details>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
    </div>
  );
}

// Modulo per aggiungere un nuovo posto alla categoria.
export function AdminNuovoPosto({ categoria, gruppi = [], conGruppo = false, etichetta = "Aggiungi" }) {
  const { ruolo } = useApp();
  const [errore, setErrore] = useState(null);
  if (ruolo !== "admin") return null;

  async function aggiungi(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const { error } = await supabase.from("posti").insert({
      categoria,
      ...leggi(f, conGruppo),
      nuovo_dal: f.nuovo.checked ? oggi() : null,
    });
    if (error) return setErrore("Errore: " + error.message);
    window.location.reload();
  }

  return (
    <details className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid var(--color-accent)" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ {etichetta} (solo admin)</summary>
      <form onSubmit={aggiungi} style={{ marginTop: "0.75rem" }}>
        <Campi gruppi={gruppi} conGruppo={conGruppo} nuovoDefault={true} />
        <button type="submit" className="btn">
          Aggiungi
        </button>
        {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
      </form>
    </details>
  );
}

// ---- Versione a icona: matita sulla scheda (admin) e "+" per aggiungere ----

// Matita in alto a destra sulla scheda: apre una finestra per correggere, segnare "Nuovo" o eliminare.
export function PostoMatita({ posto, gruppi = [], conGruppo = false }) {
  const { ruolo } = useApp();
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState(null);
  if (ruolo !== "admin") return null;

  const giorni = posto.nuovo_dal ? (Date.now() - new Date(posto.nuovo_dal).getTime()) / 86400000 : null;
  const èNuovo = giorni !== null && giorni <= 92;

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const { error } = await supabase
      .from("posti")
      .update({ ...leggi(f, conGruppo), nuovo_dal: f.nuovo.checked ? (èNuovo ? posto.nuovo_dal : oggi()) : null })
      .eq("id", posto.id);
    if (error) return setErrore("Errore: " + error.message);
    window.location.reload();
  }

  async function elimina() {
    if (!window.confirm("Eliminare «" + posto.nome + "» dalla lista?")) return;
    const { error } = await supabase.from("posti").delete().eq("id", posto.id);
    if (error) return setErrore("Errore: " + error.message);
    window.location.reload();
  }

  return (
    <>
      <span style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}>
        <Matita onClick={() => setAperto(true)} titolo="Modifica" />
      </span>
      {aperto && (
        <PopupScheda titolo={posto.nome} sottotitolo="Modifica" onChiudi={() => setAperto(false)} larga>
          <form onSubmit={salva} style={{ marginTop: "0.5rem" }}>
            <Campi posto={posto} gruppi={gruppi} conGruppo={conGruppo} nuovoDefault={èNuovo} />
            {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="submit" className="btn">
                Salva
              </button>
              <button type="button" className="btn btn-light" onClick={elimina}>
                Elimina
              </button>
            </div>
          </form>
        </PopupScheda>
      )}
    </>
  );
}

// "+" accanto al titolo della pagina per aggiungere un posto
export function PostoPiu({ categoria, gruppi = [], conGruppo = false, etichetta = "Aggiungi" }) {
  const { ruolo } = useApp();
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState(null);
  if (ruolo !== "admin") return null;

  async function aggiungi(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const { error } = await supabase.from("posti").insert({
      categoria,
      ...leggi(f, conGruppo),
      nuovo_dal: f.nuovo.checked ? oggi() : null,
    });
    if (error) return setErrore("Errore: " + error.message);
    window.location.reload();
  }

  return (
    <>
      <Piu onClick={() => setAperto(true)} titolo={etichetta} />
      {aperto && (
        <PopupScheda titolo={etichetta} onChiudi={() => setAperto(false)} larga>
          <form onSubmit={aggiungi} style={{ marginTop: "0.5rem" }}>
            <Campi gruppi={gruppi} conGruppo={conGruppo} nuovoDefault={true} />
            {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
            <button type="submit" className="btn">
              Aggiungi
            </button>
          </form>
        </PopupScheda>
      )}
    </>
  );
}
