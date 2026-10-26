"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { applicaVista } from "../../../../lib/vista";
import { supabase } from "../../../../lib/supabaseClient";

const CHECKLIST = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

export default function NuovoTurnoPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [collaboratore, setCollaboratore] = useState(null);
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

      const { data: profiloRaw } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();
      const profilo = applicaVista(profiloRaw);

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
    const ora_inizio = form.ora_inizio.value || null;
    const voci = Array.from(form.querySelectorAll('input[name="voci"]:checked')).map((c) => c.value);
    const attivita = voci.length ? voci.join(", ") : null;
    const note = form.note.value;
    const importo_dovuto = collaboratore ? ore * collaboratore.tariffa_oraria : null;

    const { error } = await supabase.from("turni_pulizia").insert({
      collaboratore_id: collaboratore.id,
      alloggio_id,
      data,
      ora_inizio,
      ore,
      attivita,
      note,
      importo_dovuto,
      stato: "da approvare",
    });

    if (!error) {
      router.push("/pulizie/collaboratore");
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
            <a href="/login" className="btn">Vai al login</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <p>
        <a href="/pulizie/collaboratore" className="btn btn-light">&larr; Il tuo saldo e i tuoi turni</a>
      </p>
      <h1>Segnala un turno</h1>

      <div className="card">
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
            Ora di inizio
            <input type="time" name="ora_inizio" required />
          </label>
          <label>
            Ore lavorate
            <input type="number" step="0.5" name="ore" required />
          </label>
          <label>Attivit&agrave; svolte</label>
          {CHECKLIST.map((voce) => (
            <label
              key={voce}
              style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <input type="checkbox" name="voci" value={voce} style={{ width: "auto", marginBottom: 0 }} />
              {voce}
            </label>
          ))}
          <label>
            Altre note
            <textarea name="note"></textarea>
          </label>
          <button type="submit" className="btn">
            Invia
          </button>
        </form>
      </div>
    </main>
  );
}
