"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { applicaVista } from "../../lib/vista";
import { useApp } from "../components/AppProvider";
import { fmtData, traduciVoci } from "../../lib/i18n";
import CalendarioVista from "../components/CalendarioVista";
import AvvisiBox from "../components/AvvisiBox";

const iso = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

export default function CollaboratoreHome() {
  const { t, lang } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [collab, setCollab] = useState(null);
  const [pulizie, setPulizie] = useState([]);

  async function caricaPulizie(id) {
    const { data } = await supabase
      .from("richieste")
      .select("*, alloggi(nome)")
      .eq("tipo", "pulizie")
      .eq("collaboratore_id", id)
      .neq("stato", "annullata")
      .order("data", { ascending: true });
    setPulizie(data || []);
  }

  useEffect(() => {
    async function carica() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setErroreAccesso("login");
        setCaricamento(false);
        return;
      }
      const { data: pRaw } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();
      const profilo = applicaVista(pRaw);
      if (!profilo || profilo.ruolo !== "collaboratore" || !profilo.collaboratore_id) {
        setErroreAccesso("ruolo");
        setCaricamento(false);
        return;
      }
      const { data: c } = await supabase
        .from("collaboratori")
        .select("*")
        .eq("id", profilo.collaboratore_id)
        .single();
      setCollab(c);
      await caricaPulizie(profilo.collaboratore_id);
      setCaricamento(false);
    }
    carica();
  }, []);

  if (caricamento) {
    return (
      <main>
        <p>{t("c.caricamento")}</p>
      </main>
    );
  }

  if (erroreAccesso) {
    return (
      <main>
        <div className="card">
          <p>
            {erroreAccesso === "login"
              ? t("c.loginRichiesto")
              : "Questa pagina e' riservata alle collaboratrici."}
          </p>
          <p>
            <a href="/login" className="btn">
              {t("c.vaiLogin")}
            </a>
          </p>
        </div>
      </main>
    );
  }

  const oggi = iso(new Date());
  const daAccettare = pulizie.filter((r) => !r.accettata_il && ["nuova", "in gestione", "confermata"].includes(r.stato));
  const prossime = pulizie
    .filter((r) => r.data >= oggi && ["nuova", "in gestione", "confermata"].includes(r.stato))
    .sort(
      (a, b) =>
        String(a.data).localeCompare(String(b.data)) || String(a.ora || "").localeCompare(String(b.ora || ""))
    )
    .slice(0, 10);

  return (
    <main>
      <h1>Ciao {collab?.nome}</h1>

      {collab && <AvvisiBox tipo="collaboratore" id={collab.id} />}

      {daAccettare.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem", background: "#fff6e0" }}>
          <p style={{ margin: 0 }}>
            <strong>{daAccettare.length}</strong>{" "}
            {daAccettare.length === 1 ? "pulizia da accettare" : "pulizie da accettare"}{" "}
            <a href="/pulizie/collaboratore" className="btn btn-light">
              Vai a Pulizie
            </a>
          </p>
        </div>
      )}

      <h2>Prossime pulizie</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {prossime.length === 0 && <p className="muted">Nessuna pulizia in programma.</p>}
        {prossime.map((r) => (
          <div key={r.id} className="richiesta-item">
            <strong>
              {fmtData(lang, r.data, false)}
              {r.ora ? " · " + String(r.ora).slice(0, 5) : ""}
            </strong>{" "}
            &mdash; {r.alloggi?.nome}
            <p className="descrizione" style={{ margin: "0.15rem 0 0" }}>
              {r.durata_ore ? `${r.durata_ore} ore` : ""}
              {r.descrizione ? ` — ${traduciVoci("it", r.descrizione)}` : ""}
              {r.note ? ` (${r.note})` : ""}
              {!r.accettata_il ? " — da accettare" : ""}
            </p>
          </div>
        ))}
      </div>

      <h2>Calendario</h2>
      <div className="card" style={{ marginBottom: "2rem" }}>
        <CalendarioVista
          eventi={pulizie}
          colore={() => "#2f4739"}
          soloLettura
          mostraAlloggio
          testoAttesa="da accettare"
        />
      </div>
    </main>
  );
}
