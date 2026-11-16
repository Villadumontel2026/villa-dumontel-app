"use client";

import { Matita, Cestino } from "../../../components/IconeAzione";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import ModificaLingue, { CampoLingue, VistaLingua } from "../../../components/ModificaLingue";
import PopupScheda from "../../../components/PopupEvento";

export default function TaskPulizieAdminPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [task, setTask] = useState([]);
  const [errore, setErrore] = useState(null);
  const [messaggio, setMessaggio] = useState(null);
  const [vista, setVista] = useState("it");
  const [editId, setEditId] = useState(null);

  async function carica() {
    const { data } = await supabase.from("task_pulizie").select("*").order("ordine", { ascending: true });
    setTask(data || []);
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
      await carica();
      setCaricamento(false);
    }
    inizia();
  }, []);

  const esegui = async (promessa, ok) => {
    const { error } = await promessa;
    if (error) return setErrore("Errore: " + error.message);
    setErrore(null);
    if (ok) {
      setMessaggio(ok);
      setTimeout(() => setMessaggio(null), 2000);
    }
    await carica();
  };

  async function aggiungi(e) {
    e.preventDefault();
    const f = e.target;
    const maxOrdine = task.reduce((m, x) => Math.max(m, x.ordine || 0), 0);
    await esegui(
      supabase.from("task_pulizie").insert({
        nome_it: f.nome_it.value.trim(),
        nome_en: f.nome_en.value.trim() || null,
        nome_fr: f.nome_fr.value.trim() || null,
        ordine: maxOrdine + 1,
      }),
      "Task aggiunto."
    );
    f.reset();
  }

  async function salva(e, x) {
    e.preventDefault();
    const f = e.target;
    await esegui(
      supabase
        .from("task_pulizie")
        .update({ nome_it: f.nome_it.value.trim(), nome_en: f.nome_en.value.trim() || null, nome_fr: f.nome_fr.value.trim() || null })
        .eq("id", x.id),
      "Salvato."
    );
  }

  async function sposta(indice, dir) {
    const a = task[indice];
    const b = task[indice + dir];
    if (!a || !b) return;
    // scambia l'ordine con il vicino
    const oa = a.ordine ?? indice;
    const ob = b.ordine ?? indice + dir;
    await esegui(
      Promise.all([
        supabase.from("task_pulizie").update({ ordine: ob }).eq("id", a.id),
        supabase.from("task_pulizie").update({ ordine: oa }).eq("id", b.id),
      ]).then((r) => r.find((x) => x.error) || { error: null })
    );
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
            <a href="/login" className="btn">
              Vai al login
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <p>
        <a href="/pulizie/admin" className="btn btn-light">
          &larr; Pulizie
        </a>
      </p>
      <h1>Lista dei task di pulizia</h1>
      <p className="muted">
        Sono le voci che compaiono nelle richieste di pulizia (ospite e admin) e nel &quot;Segnala un turno&quot;
        della collaboratrice. Se ne togli una dalla lista (&quot;Nascondi&quot;) non compare pi&ugrave; tra le scelte, ma resta
        leggibile nelle richieste gi&agrave; fatte. Se cambi il nome italiano, le richieste vecchie
        mantengono il nome precedente.
      </p>

      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}
      {messaggio && <p style={{ color: "#1f5c2e" }}>{messaggio}</p>}

      <details className="card" style={{ marginBottom: "1.5rem" }} open>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Nuovo task</summary>
        <form onSubmit={aggiungi} style={{ marginTop: "0.75rem" }}>
          <ModificaLingue>
            <CampoLingue etichetta="Nome" nomi={{ it: "nome_it", en: "nome_en", fr: "nome_fr" }} richiesto />
          </ModificaLingue>
          <button type="submit" className="btn">
            Aggiungi
          </button>
        </form>
      </details>

      <VistaLingua lingua={vista} onChange={setVista} />
      <div className="card">
        {task.length === 0 && <p className="muted">Nessun task: esegui lo SQL task_pulizie.sql.</p>}
        {task.map((x, i) => (
          <div key={x.id} className="richiesta-item" style={{ opacity: x.attivo ? 1 : 0.55 }}>
            {x["nome_" + vista] ? (
              <strong>{x["nome_" + vista]}</strong>
            ) : (
              <span style={{ color: "#a32d2d" }}>
                <em>manca la traduzione</em> <span className="muted">({x.nome_it})</span>
              </span>
            )}
            {!x.attivo && <span className="muted"> (nascosto)</span>}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "0.4rem 0" }}>
              <button type="button" className="btn btn-light" style={{ padding: "0.25rem 0.7rem" }} disabled={i === 0} onClick={() => sposta(i, -1)}>
                &uarr;
              </button>
              <button type="button" className="btn btn-light" style={{ padding: "0.25rem 0.7rem" }} disabled={i === task.length - 1} onClick={() => sposta(i, 1)}>
                &darr;
              </button>
              <button
                type="button"
                className="btn btn-light"
                style={{ padding: "0.25rem 0.7rem" }}
                onClick={() => esegui(supabase.from("task_pulizie").update({ attivo: !x.attivo }).eq("id", x.id))}
              >
                {x.attivo ? "Nascondi" : "Mostra"}
              </button>
              <Cestino
                onClick={() => {
                  if (window.confirm("Eliminare «" + x.nome_it + "» dalla lista?")) {
                    esegui(supabase.from("task_pulizie").delete().eq("id", x.id));
                  }
                }}
              />
            </div>
            <Matita onClick={() => setEditId(x.id)} titolo="Modifica i nomi" />
          </div>
        ))}
      </div>
      {editId && (() => {
        const x = task.find((k) => k.id === editId);
        if (!x) return null;
        return (
          <PopupScheda titolo={x.nome_it} sottotitolo="Nomi nelle tre lingue" onChiudi={() => setEditId(null)} larga>
            <form
              onSubmit={async (e) => {
                await salva(e, x);
                setEditId(null);
              }}
              style={{ marginTop: "0.5rem" }}
            >
              <ModificaLingue>
                <CampoLingue etichetta="Nome" nomi={{ it: "nome_it", en: "nome_en", fr: "nome_fr" }} valori={{ it: x.nome_it, en: x.nome_en, fr: x.nome_fr }} richiesto />
              </ModificaLingue>
              <button type="submit" className="btn">
                Salva
              </button>
            </form>
          </PopupScheda>
        );
      })()}
    </main>
  );
}
