"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function PaginaOspitePulizie() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);

  const [turni, setTurni] = useState([]);
  const [pagamentiCollab, setPagamentiCollab] = useState([]);
  const [pagamentiFam, setPagamentiFam] = useState([]);

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

      if (!profilo || profilo.ruolo !== "ospite" || !profilo.famiglia_id) {
        setErroreAccesso("Questa pagina e' riservata agli ospiti.");
        setCaricamento(false);
        return;
      }

      const { data: turniData } = await supabase
        .from("turni_pulizia")
        .select("*, alloggi(nome)")
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
        .eq("famiglia_id", profilo.famiglia_id)
        .order("data", { ascending: false });
      setPagamentiFam(pagFamData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

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

  const totaleDovuto = pagamentiCollab.reduce(
    (s, p) => s + (p.importo || 0),
    0
  );
  const totalePagato = pagamentiFam.reduce((s, p) => s + (p.importo || 0), 0);
  const saldo = totaleDovuto - totalePagato;

  return (
    <main>
      <h1>Pulizie</h1>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Il tuo saldo</h2>
        <p>Totale dovuto: {totaleDovuto.toFixed(2)} &euro;</p>
        <p>Totale gia&apos; versato: {totalePagato.toFixed(2)} &euro;</p>
        <p>
          <strong>Saldo residuo: {saldo.toFixed(2)} &euro;</strong>
        </p>
      </div>

      <h2>Storico pulizie</h2>
      <div className="card">
        {turni.length === 0 && <p className="muted">Nessun turno registrato.</p>}
        {turni.map((t) => (
          <div key={t.id} className="richiesta-item">
            <strong>{t.alloggi?.nome}</strong> &mdash; {t.data}
            {t.note && <p className="descrizione">{t.note}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
