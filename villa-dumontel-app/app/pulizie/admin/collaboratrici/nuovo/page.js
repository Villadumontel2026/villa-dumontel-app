"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";

export default function NuovoVersamentoPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [collaboratori, setCollaboratori] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
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

      setCaricamento(false);
    }

    carica();
  }, []);

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
      router.push("/pulizie/admin/collaboratrici");
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
        <a href="/pulizie/admin/collaboratrici">&larr; Collaboratrici</a>
      </p>
      <h1>Registra un versamento</h1>

      <div className="card">
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
    </main>
  );
}
