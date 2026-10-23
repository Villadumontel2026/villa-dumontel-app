"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

export default function ModificaSpesaPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
  const [spesa, setSpesa] = useState(null);
  const [errore, setErrore] = useState(null);
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

      const { data: famiglieData } = await supabase.from("famiglie").select("*");
      setFamiglie(famiglieData || []);

      const id = new URLSearchParams(window.location.search).get("id");
      const { data: spesaData } = await supabase
        .from("spese_famiglia")
        .select("*")
        .eq("id", id)
        .single();
      if (!spesaData) {
        setErroreAccesso("Spesa non trovata.");
        setCaricamento(false);
        return;
      }
      if (spesaData.pagamento_collaboratore_id) {
        setErroreAccesso(
          "Questa spesa e' generata da un versamento alla collaboratrice: si modifica da Pulizie > Collaboratrici."
        );
        setCaricamento(false);
        return;
      }
      setSpesa(spesaData);

      setCaricamento(false);
    }

    carica();
  }, []);

  async function salvaSpesa(e) {
    e.preventDefault();
    const form = e.target;
    const famiglia_id = form.famiglia_id.value;
    const oggetto = form.oggetto.value;
    const data = form.data.value;
    const importo = parseFloat(form.importo.value);
    const note = form.note.value;
    const anno_riferimento = parseInt(form.anno_riferimento.value, 10) || parseInt(data.slice(0, 4), 10);

    const { error } = await supabase.from("spese_famiglia").update({
      famiglia_id,
      oggetto,
      data,
      importo,
      note,
      anno_riferimento,
    }).eq("id", spesa.id);

    if (!error) {
      router.push("/spese/admin");
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

  return (
    <main>
      <p>
        <a href="/spese/admin">&larr; Spese</a>
      </p>
      <h1>Modifica spesa</h1>

      <div className="card">
        <form onSubmit={salvaSpesa}>
          <label>
            Famiglia
            <select name="famiglia_id" defaultValue={spesa.famiglia_id} required>
              {famiglie.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Oggetto
            <input type="text" name="oggetto" defaultValue={spesa.oggetto} required />
          </label>
          <label>
            Data
            <input type="date" name="data" defaultValue={spesa.data} required />
          </label>
          <label>
            Anno di riferimento (lascia vuoto = anno della data)
            <input type="number" name="anno_riferimento" min="2020" max="2100" defaultValue={spesa.anno_riferimento || ""} />
          </label>
          <label>
            Importo (&euro;)
            <input type="number" step="0.01" name="importo" defaultValue={spesa.importo} required />
          </label>
          <label>
            Note
            <textarea name="note" defaultValue={spesa.note || ""}></textarea>
          </label>
          <button type="submit" className="btn">
            Salva modifiche
          </button>
        </form>
      </div>
    </main>
  );
}
