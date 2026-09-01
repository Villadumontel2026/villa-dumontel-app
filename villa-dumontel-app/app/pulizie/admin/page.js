"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

function classeBadgeStato(stato) {
  if (stato === "da approvare") return "badge badge-nuova";
  if (stato === "approvato") return "badge badge-confermata";
  if (stato === "rifiutato") return "badge badge-completata";
  return "badge";
}

export default function PaginaAdminPulizie() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);

  const [collaboratori, setCollaboratori] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
  const [famiglie, setFamiglie] = useState([]);
  const [turni, setTurni] = useState([]);
  const [pagamentiCollab, setPagamentiCollab] = useState([]);
  const [pagamentiFam, setPagamentiFam] = useState([]);

  async function caricaDati() {
    const { data: collaboratoriData } = await supabase
      .from("collaboratori")
      .select("*");
    setCollaboratori(collaboratoriData || []);

    const { data: alloggiData } = await supabase.from("alloggi").select("*");
    setAlloggi(alloggiData || []);

    const { data: famiglieData } = await supabase.from("famiglie").select("*");
    setFamiglie(famiglieData || []);

    const { data: turniData } = await supabase
      .from("turni_pulizia")
      .select("*, alloggi(nome), collaboratori(nome)")
      .order("data", { ascending: false });
    setTurni(turniData || []);

    const { data: pagCollabData } = await supabase
      .from("pagamenti_collaboratori")
      .select("*")
      .order("data", { ascending: false });
    setPagamentiCollab(pagCollabData || []);

    const { data: pagFamData } = await supabase
      .from("pagamenti_famiglie")
      .select("*")
      .order("data", { ascending: false });
    setPagamentiFam(pagFamData || []);
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

      await caricaDati();
      setCaricamento(false);
    }

    carica();
  }, []);

  async function approvaTurno(id) {
    const { error } = await supabase
      .from("turni_pulizia")
      .update({ stato: "approvato" })
      .eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    await caricaDati();
  }

  async function rifiutaTurno(id) {
    const { error } = await supabase
      .from("turni_pulizia")
      .update({ stato: "rifiutato" })
      .eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    await caricaDati();
  }

  async function registraPagamentoCollaboratrice(e) {
    e.preventDefault();
    const form = e.target;
    const collaboratore_id = form.collaboratore_id.value;
    const alloggio_id = form.alloggio_id.value;
    const importo = parseFloat(form.importo.value);
    const data = form.data.value;
    const note = form.note.value;

    const { error } = await supabase.from("pagamenti_collaboratori").insert({
      collaboratore_id,
      alloggio_id,
      importo,
      data,
      note,
    });

    if (!error) {
      form.reset();
      await caricaDati();
    } else {
      alert("Errore: " + error.message);
    }
  }

  async function registraIncassoFamiglia(e) {
    e.preventDefault();
    const form = e.target;
    const famiglia_id = form.famiglia_id.value;
    const importo = parseFloat(form.importo.value);
    const data = form.data.value;
    const metodo = form.metodo.value;
    const note = form.note.value;

    const { error } = await supabase.from("pagamenti_famiglie").insert({
      famiglia_id,
      importo,
      data,
      metodo,
      note,
    });

    if (!error) {
      form.reset();
      await caricaDati();
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

  const turniDaApprovare = turni.filter((t) => t.stato === "da approvare");
  const turniStorico = turni.filter((t) => t.stato !== "da approvare");

  const situazioneCollaboratori = collaboratori.map((c) => {
    const dovuto = turni
      .filter((t) => t.collaboratore_id === c.id && t.stato === "approvato")
      .reduce((s, t) => s + (t.importo_dovuto || 0), 0);
    const pagato = pagamentiCollab
      .filter((p) => p.collaboratore_id === c.id)
      .reduce((s, p) => s + (p.importo || 0), 0);
    return { ...c, dovuto, pagato, saldo: dovuto - pagato };
  });

  const situazioneFamiglie = famiglie.map((f) => {
    const alloggiFamiglia = alloggi
      .filter((a) => a.famiglia_id === f.id)
      .map((a) => a.id);
    const addebito = pagamentiCollab
      .filter((p) => alloggiFamiglia.includes(p.alloggio_id))
      .reduce((s, p) => s + (p.importo || 0), 0);
    const pagato = pagamentiFam
      .filter((p) => p.famiglia_id === f.id)
      .reduce((s, p) => s + (p.importo || 0), 0);
    return { ...f, addebito, pagato, saldo: addebito - pagato };
  });

  return (
    <main>
      <p>
        <a href="/richieste">&larr; Richieste</a>
      </p>
      <h1>Pulizie &mdash; gestione</h1>

      <section style={{ marginBottom: "1.75rem" }}>
        <h2>
          Turni da approvare{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            ({turniDaApprovare.length})
          </span>
        </h2>
        {turniDaApprovare.length === 0 && (
          <p className="muted">Nessun turno in attesa.</p>
        )}
        {turniDaApprovare.length > 0 && (
          <div className="card">
            {turniDaApprovare.map((t) => (
              <div key={t.id} className="richiesta-item">
                <span className={classeBadgeStato(t.stato)}>{t.stato}</span>{" "}
                <strong>{t.collaboratori?.nome}</strong> &mdash;{" "}
                {t.alloggi?.nome} &mdash; {t.data} &mdash; {t.ore} ore
                {t.note && <p className="descrizione">{t.note}</p>}
                <div className="stato-actions">
                  <button className="btn" onClick={() => approvaTurno(t.id)}>
                    Approva
                  </button>{" "}
                  <button className="btn" onClick={() => rifiutaTurno(t.id)}>
                    Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: "1.75rem" }}>
        <h2>Situazione collaboratrici</h2>
        <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
          {situazioneCollaboratori.map((c) => (
            <div key={c.id} className="card">
              <h3 style={{ marginBottom: "0.25rem" }}>{c.nome}</h3>
              <p className="muted" style={{ margin: "0.25rem 0" }}>
                Dovuto (turni approvati): {c.dovuto.toFixed(2)} &euro;
              </p>
              <p className="muted" style={{ margin: "0.25rem 0" }}>
                Gia&apos; versato: {c.pagato.toFixed(2)} &euro;
              </p>
              <p style={{ margin: "0.25rem 0" }}>
                <strong>Saldo residuo: {c.saldo.toFixed(2)} &euro;</strong>
              </p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Registra un versamento alla collaboratrice</h3>
          <form onSubmit={registraPagamentoCollaboratrice}>
            <label>
              Collaboratrice
              <select name="collaboratore_id" required>
                {collaboratori.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alloggio (per attribuzione al costo famiglia)
              <select name="alloggio_id" required>
                {alloggi.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Importo versato (&euro;)
              <input type="number" step="0.01" name="importo" required />
            </label>
            <label>
              Data
              <input type="date" name="data" required />
            </label>
            <label>
              Note
              <textarea name="note"></textarea>
            </label>
            <button type="submit" className="btn">
              Registra versamento
            </button>
          </form>
        </div>
      </section>

      <section style={{ marginBottom: "1.75rem" }}>
        <h2>Situazione famiglie (costo pulizie)</h2>
        <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
          {situazioneFamiglie.map((f) => (
            <div key={f.id} className="card">
              <h3 style={{ marginBottom: "0.25rem" }}>{f.nome}</h3>
              <p className="muted" style={{ margin: "0.25rem 0" }}>
                Da addebitare (versato alla collaboratrice): {f.addebito.toFixed(2)} &euro;
              </p>
              <p className="muted" style={{ margin: "0.25rem 0" }}>
                Gia&apos; ricevuto: {f.pagato.toFixed(2)} &euro;
              </p>
              <p style={{ margin: "0.25rem 0" }}>
                <strong>Saldo da incassare: {f.saldo.toFixed(2)} &euro;</strong>
              </p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Registra un incasso dalla famiglia</h3>
          <form onSubmit={registraIncassoFamiglia}>
            <label>
              Famiglia
              <select name="famiglia_id" required>
                {famiglie.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
