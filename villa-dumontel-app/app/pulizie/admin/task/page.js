"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function TaskPulizieAdminPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [task, setTask] = useState([]);
  const [errore, setErrore] = useState(null);
  const [messaggio, setMessaggio] = useState(null);

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
        .update({ nome_it: f.nome_it.value.trim(), nome_en: f.nome_en.value.trim() || null })
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
          <label>
            Nome (italiano)
            <input type="text" name="nome_it" required />
          </label>
          <label>
            Nome (inglese, lo vede l&apos;ospite)
            <input type="text" name="nome_en" />
          </label>
          <button type="submit" className="btn">
            Aggiungi
          </button>
        </form>
      </details>

      <div className="card">
        {task.length === 0 && <p className="muted">Nessun task: esegui lo SQL task_pulizie.sql.</p>}
        {task.map((x, i) => (
          <div key={x.id} className="richiesta-item" style={{ opacity: x.attivo ? 1 : 0.55 }}>
            <strong>{x.nome_it}</strong>
            {x.nome_en ? <span className="muted"> &mdash; {x.nome_en}</span> : null}
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
              <button
                type="button"
                className="btn btn-light"
                style={{ padding: "0.25rem 0.7rem" }}
                onClick={() => {
                  if (window.confirm("Eliminare «" + x.nome_it + "» dalla lista?")) {
                    esegui(supabase.from("task_pulizie").delete().eq("id", x.id));
                  }
                }}
              >
                Elimina
              </button>
            </div>
            <details>
              <summary style={{ cursor: "pointer" }}>Modifica i nomi</summary>
              <form onSubmit={(e) => salva(e, x)} style={{ marginTop: "0.5rem" }}>
                <label>
                  Nome (italiano)
                  <input type="text" name="nome_it" defaultValue={x.nome_it} required />
                </label>
                <label>
                  Nome (inglese)
                  <input type="text" name="nome_en" defaultValue={x.nome_en || ""} />
                </label>
                <button type="submit" className="btn">
                  Salva
                </button>
              </form>
            </details>
          </div>
        ))}
      </div>
    </main>
  );
}
