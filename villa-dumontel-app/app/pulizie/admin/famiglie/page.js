"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function FamigliePulizieAdminPage() {
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);

  const [famiglie, setFamiglie] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
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

      if (!profilo || profilo.ruolo !== "admin") {
        setErroreAccesso("Questa pagina e' riservata all'amministratore.");
        setCaricamento(false);
        return;
      }

      const { data: famiglieData } = await supabase.from("famiglie").select("*");
      setFamiglie(famiglieData || []);

      const { data: alloggiData } = await supabase.from("alloggi").select("*");
      setAlloggi(alloggiData || []);

      const { data: pagCollabData } = await supabase
        .from("pagamenti_collaboratori")
        .select("*");
      setPagamentiCollab(pagCollabData || []);

      const { data: pagFamData } = await supabase
        .from("pagamenti_famiglie")
        .select("*");
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

  const situazione = famiglie.map((f) => {
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
        <a href="/pulizie/admin">&larr; Pulizie</a>
      </p>
      <h1>Famiglie</h1>

      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/pulizie/admin/famiglie/nuovo" className="btn">
          Registra un incasso
        </a>
      </p>

      <div style={{ display: "grid", gap: "1rem" }}>
        {situazione.map((f) => (
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
    </main>
  );
}
