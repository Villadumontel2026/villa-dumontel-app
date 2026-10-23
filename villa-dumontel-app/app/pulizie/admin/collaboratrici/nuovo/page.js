"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";

export default function NuovoVersamentoPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [collaboratori, setCollaboratori] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
  const [famiglie, setFamiglie] = useState([]);
  const [importi, setImporti] = useState({});
  const [invio, setInvio] = useState(false);
  const router = useRouter();

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

      const { data: collaboratoriData } = await supabase
        .from("collaboratori")
        .select("*");
      setCollaboratori(collaboratoriData || []);

      const { data: alloggiData } = await supabase.from("alloggi").select("*");
      setAlloggi(alloggiData || []);

      const { data: famiglieData } = await supabase.from("famiglie").select("*");
      setFamiglie(famiglieData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  const totale = Object.values(importi).reduce((t, v) => t + (parseFloat(v) || 0), 0);

  async function registraPagamentoCollaboratrice(e) {
    e.preventDefault();
    const form = e.target;
    const collaboratore_id = form.collaboratore_id.value;
    const data = form.data.value;
    const note = form.note.value || null;
    const anno = form.anno_riferimento.value ? parseInt(form.anno_riferimento.value, 10) : null;

    const righe = alloggi
      .map((a) => ({ alloggio_id: a.id, importo: parseFloat(importi[a.id]) }))
      .filter((r) => r.importo > 0)
      .map((r) => ({
        collaboratore_id,
        alloggio_id: r.alloggio_id,
        importo: r.importo,
        data,
        note,
        anno_riferimento: anno,
      }));

    if (righe.length === 0) {
      alert("Inserisci l'importo per almeno un alloggio.");
      return;
    }

    setInvio(true);
    const { error } = await supabase.from("pagamenti_collaboratori").insert(righe);
    setInvio(false);

    if (!error) {
      router.push("/pulizie/admin/collaboratrici");
    } else {
      alert("Errore: " + error.message);
    }
  }

  function nomeFamiglia(alloggio) {
    const f = famiglie.find((x) => x.id === alloggio.famiglia_id);
    return f ? f.nome : "";
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
        <a href="/pulizie/admin/collaboratrici">&larr; Collaboratrici</a>
      </p>
      <h1>Registra un versamento</h1>

      <div className="card">
        <p className="muted">
          Indica quanto hai versato per ciascun alloggio (lascia vuoto o 0 se non
          riguarda un alloggio). Ogni importo finisce anche nelle spese della famiglia
          corrispondente.
        </p>
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

          {alloggi.map((a) => (
            <label key={a.id}>
              {a.nome}
              {nomeFamiglia(a) ? ` — ${nomeFamiglia(a)}` : ""} (&euro;)
              <input
                type="number"
                step="0.01"
                min="0"
                value={importi[a.id] || ""}
                onChange={(e) => setImporti({ ...importi, [a.id]: e.target.value })}
              />
            </label>
          ))}

          <p>
            <strong>Totale versato: {totale.toFixed(2)} &euro;</strong>
          </p>

          <label>
            Data
            <input type="date" name="data" required />
          </label>
          <label>
            Anno di riferimento (lascia vuoto = anno della data)
            <input type="number" name="anno_riferimento" min="2020" max="2100" />
          </label>
          <label>
            Note
            <textarea name="note"></textarea>
          </label>
          <button type="submit" className="btn" disabled={invio}>
            Registra versamento
          </button>
        </form>
      </div>
    </main>
  );
}
