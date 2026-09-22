"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

export default function NuovaSpesaPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
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

      setCaricamento(false);
    }

    carica();
  }, []);

  async function registraSpesa(e) {
    e.preventDefault();
    const form = e.target;
    const famiglia_id = form.famiglia_id.value;
    const oggetto = form.oggetto.value;
    const data = form.data.value;
    const importo = parseFloat(form.importo.value);
    const note = form.note.value;

    const { error } = await supabase.from("spese_famiglia").insert({
      famiglia_id,
      oggetto,
      data,
      importo,
      note,
    });

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
        <a href="/spese/admin">&larr; Spese generiche</a>
      </p>
      <h1>Aggiungi una spesa</h1>

      <div className="card">
        <form onSubmit={registraSpesa}>
          <label>
            Famiglia
            <select name="famiglia_id" required>
              {famiglie.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Oggetto
            <input type="text" name="oggetto" placeholder="es. Elettricita', vino, tassa rifiuti..." required />
          </label>
          <label>
            Data
            <input type="date" name="data" required />
          </label>
          <label>
            Importo (&euro;)
            <input type="number" step="0.01" name="importo" required />
          </label>
          <label>
            Note
            <textarea name="note"></textarea>
          </label>
          <button type="submit" className="btn">
            Registra spesa
          </button>
        </form>
      </div>
    </main>
  );
}
