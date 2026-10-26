"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

export default function NuovoVersamentoOspitiPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
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
      const { data } = await supabase.from("famiglie").select("*").order("id");
      setFamiglie(data || []);
      setCaricamento(false);
    }
    carica();
  }, []);

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const { error } = await supabase.from("pagamenti_famiglie").insert({
      famiglia_id: f.famiglia_id.value,
      importo: parseFloat(f.importo.value),
      data: f.data.value,
      metodo: f.metodo.value,
      note: f.note.value || null,
    });
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    router.push("/spese/admin");
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
        <a href="/spese/admin" className="btn btn-light">
          &larr; Spese
        </a>
      </p>
      <h1>Registra un versamento</h1>
      <div className="card">
        <form onSubmit={salva}>
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
            <input type="number" step="0.01" min="0" name="importo" required />
          </label>
          <label>
            Data
            <input type="date" name="data" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </label>
          <label>
            Tipologia
            <select name="metodo" required>
              <option value="bonifico">Bonifico</option>
              <option value="contanti">Contanti</option>
            </select>
          </label>
          <label>
            Note
            <textarea name="note"></textarea>
          </label>
          {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
          <button type="submit" className="btn">
            Registra versamento
          </button>
        </form>
      </div>
    </main>
  );
}
