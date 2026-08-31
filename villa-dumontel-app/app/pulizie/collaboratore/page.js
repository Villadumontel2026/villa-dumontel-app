"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

function classeBadgeStato(stato) {
  if (stato === "da approvare") return "badge badge-nuova";
  if (stato === "approvato") return "badge badge-confermata";
  if (stato === "rifiutato") return "badge badge-completata";
  return "badge";
}

export default function PaginaCollaboratrice() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [collaboratore, setCollaboratore] = useState(null);
  const [alloggi, setAlloggi] = useState([]);
  const [turni, setTurni] = useState([]);
  const [pagamenti, setPagamenti] = useState([]);

  async function ricaricaTurni(collaboratoreId) {
    const { data } = await supabase
      .from("turni_pulizia")
      .select("*, alloggi(nome)")
      .eq("collaboratore_id", collaboratoreId)
      .order("data", { ascending: false });
    setTurni(data || []);
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

      if (!profilo || profilo.ruolo !== "collaboratore" || !profilo.collaboratore_id) {
        setErroreAccesso("Questa pagina e' riservata alle collaboratrici.");
        setCaricamento(false);
        return;
      }

      const { data: collab } = await supabase
        .from("collaboratori")
        .select("*")
        .eq("id", profilo.collaboratore_id)
        .single();
      setCollaboratore(collab);

      const { data: alloggiData } = await supabase.from("alloggi").select("*");
      setAlloggi(alloggiData || []);

      await ricaricaTurni(profilo.collaboratore_id);

      const { data: pagamentiData } = await supabase
        .from("pagamenti_collaboratori")
        .select("*")
        .eq("collaboratore_id", profilo.collaboratore_id);
      setPagamenti(pagamentiData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  async function segnalaTurno(e) {
    e.preventDefault();
    const form = e.target;
    const alloggio_id = form.alloggio_id.value;
    const data = form.data.value;
    const ore = parseFloat(form.ore.value);
    const note = form.note.value;
    const importo_dovuto = collaboratore ? ore * collaboratore.tariffa_oraria : null;

    const { error } = await supabase.from("turni_pulizia").insert({
      collaboratore_id: collaboratore.id,
      alloggio_id,
      data,
      ore,
      note,
      importo_dovuto,
      stato: "da approvare",
    });

    if (!error) {
      form.reset();
      await ricaricaTurni(collaboratore.id);
    } else {
      alert("Errore: " + error.message);
    }
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

  const totaleDovuto = turni
    .filter((t) => t.stato === "approvato")
    .reduce((s, t) => s + (t.importo_dovuto || 0), 0);
  const totalePagato = pagamenti.reduce((s, p) => s + (p.importo || 0), 0);
  const saldo = totaleDovuto - totalePagato;

  return (
    <main>
      <h1>Ciao {collaboratore?.nome}</h1>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Segnala un turno</h2>
        <form onSubmit={segnalaTurno}>
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
          <label>
            Data
            <input type="date" name="data" required />
          </label>
          <label>
            Ore lavorate
            <input type="number" step="0.5" name="ore" required />
          </label>
          <label>
            Cosa hai fatto
            <textarea name="note"></textarea>
          </label>
          <button type="submit" className="btn">
            Invia
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Il tuo saldo</h2>
        <p>Totale dovuto (turni approvati): {totaleDovuto.toFixed(2)} &euro;</p>
        <p>Totale gia&apos; ricevuto: {totalePagato.toFixed(2)} &euro;</p>
        <p>
          <strong>Saldo residuo: {saldo.toFixed(2)} &euro;</strong>
        </p>
      </div>

      <h2>I tuoi turni</h2>
      <div className="card">
        {turni.length === 0 && <p className="muted">Nessun turno registrato.</p>}
        {turni.map((t) => (
          <div key={t.id} className="richiesta-item">
            <span className={classeBadgeStato(t.stato)}>{t.stato}</span>{" "}
            <strong>{t.alloggi?.nome}</strong> &mdash; {t.data} &mdash; {t.ore} ore
            {t.note && <p className="descrizione">{t.note}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
