"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";

export default function NuovoIncassoPage() {
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
      router.push("/pulizie/admin/famiglie");
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
        <a href="/pulizie/admin/famiglie">&larr; Famiglie</a>
      </p>
      <h1>Registra un incasso</h1>

      <div className="card">
        <form onSubmit={registraIncassoFamiglia}>
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
            Importo ricevuto (&euro;)
            <input type="number" step="0.01" name="importo" required />
          </label>
          <label>
            Data
            <input type="date" name="data" required />
          </label>
          <label>
            Modalita&apos;
            <select name="metodo" required>
              <option value="bonifico">Bonifico</option>
              <option value="contanti">Contanti</option>
            </select>
          </label>
          <label>
            Note
            <textarea name="note"></textarea>
          </label>
          <button type="submit" className="btn">
            Registra incasso
          </button>
        </form>
      </div>
    </main>
  );
}
