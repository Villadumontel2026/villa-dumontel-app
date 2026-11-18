"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { applicaVista } from "../../lib/vista";
import { useApp } from "../components/AppProvider";
import { fmtData } from "../../lib/i18n";
import CalendarioVista from "../components/CalendarioVista";
import AvvisiBox from "../components/AvvisiBox";
import { espandiEventi, coloreEvento } from "../../lib/eventi";

const iso = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

export default function CollaboratoreHome() {
  const { t, lang, voci } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [collab, setCollab] = useState(null);
  const [pulizie, setPulizie] = useState([]);
  const [eventiCal, setEventiCal] = useState([]);
  const [todo, setTodo] = useState([]);

  async function caricaPulizie(id) {
    const { data } = await supabase
      .from("richieste")
      .select("*, alloggi(nome)")
      .eq("tipo", "pulizie")
      .eq("collaboratore_id", id)
      .neq("stato", "annullata")
      .order("data", { ascending: true });
    setPulizie(data || []);
    const { data: evs } = await supabase.from("eventi").select("*").order("data_inizio", { ascending: true }).limit(500);
    setEventiCal(evs || []);
    const { data: td } = await supabase
      .from("todo_alloggio")
      .select("*, alloggi(nome), todo_voci(*)")
      .order("scadenza", { ascending: true, nullsFirst: false });
    setTodo(td || []);
  }

  // x = un punto del To Do a lei collegato
  async function segnaTodo(x, fatto) {
    let nota = null;
    if (fatto) {
      nota = window.prompt("Vuoi lasciare una nota? (facoltativa)", "");
      if (nota === null) return;
    }
    const { error } = await supabase.rpc("todo_collab_segna", { p_id: x.id, p_fatto: fatto, p_nota: nota });
    if (error) window.alert("Errore: " + error.message);
    if (collab) await caricaPulizie(collab.id);
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
    .filter((r) => (!r.data || r.data >= oggi) && ["nuova", "in gestione", "confermata"].includes(r.stato))
    .sort(
      (a, b) =>
        String(a.data || "9999").localeCompare(String(b.data || "9999")) || String(a.ora || "").localeCompare(String(b.ora || ""))
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

      {todo.length > 0 && (
        <>
          <h2>To Do</h2>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            {todo
              .filter((x) => (x.todo_voci || []).some((p) => !p.fatto))
              .map((x) => {
                const giorni = x.scadenza ? Math.round((new Date(x.scadenza) - new Date(oggi)) / 86400000) : null;
                const mieiPunti = (x.todo_voci || []).slice().sort((a, b) => (a.ordine || 0) - (b.ordine || 0) || a.id - b.id);
                return (
                  <div
                    key={x.id}
                    className="richiesta-item"
                    style={{ background: giorni !== null && giorni < 0 ? "#fde2e2" : giorni !== null && giorni <= 7 ? "#fff6e0" : "transparent", borderRadius: 8, padding: "0.5rem" }}
                  >
                    <strong>{x.titolo}</strong>
                    <p className="descrizione" style={{ margin: "0.15rem 0" }}>
                      {x.alloggi?.nome}
                      {x.scadenza ? ` — entro il ${fmtData(lang, x.scadenza, false)}` : ""}
                    </p>
                    {x.note && (
                      <p className="descrizione muted" style={{ margin: "0.1rem 0", whiteSpace: "pre-line" }}>
                        {x.note}
                      </p>
                    )}
                    {mieiPunti.map((p) => (
                      <label key={p.id} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontWeight: 400, margin: "0.3rem 0" }}>
                        <input
                          type="checkbox"
                          checked={!!p.fatto}
                          onChange={(e) => segnaTodo(p, e.target.checked)}
                          style={{ width: "auto", marginTop: "0.25rem", marginBottom: 0 }}
                        />
                        <span style={{ textDecoration: p.fatto ? "line-through" : "none", opacity: p.fatto ? 0.6 : 1 }}>{p.testo}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
            {todo.filter((x) => (x.todo_voci || []).some((p) => !p.fatto)).length === 0 && <p className="muted">Nessun punto da fare.</p>}
          </div>
        </>
      )}

      <h2>Prossime pulizie</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {prossime.length === 0 && <p className="muted">Nessuna pulizia in programma.</p>}
        {prossime.map((r) => (
          <div key={r.id} className="richiesta-item">
            <strong>
              {r.data ? fmtData(lang, r.data, false) : "Data da definire"}
              {r.ora ? " · " + String(r.ora).slice(0, 5) : ""}
            </strong>{" "}
            &mdash; {r.alloggi?.nome}
            <p className="descrizione" style={{ margin: "0.15rem 0 0" }}>
              {r.durata_ore ? `${r.durata_ore} ore` : ""}
              {r.descrizione ? ` — ${voci(r.descrizione)}` : ""}
              {r.note ? ` (${r.note})` : ""}
              {!r.accettata_il ? " — da accettare" : ""}
            </p>
          </div>
        ))}
      </div>

      <h2>Calendario</h2>
      <div className="card" style={{ marginBottom: "2rem" }}>
        <CalendarioVista
          eventi={[...pulizie, ...espandiEventi(eventiCal, lang)]}
          colore={(r) => (r.tipo === "evento" ? coloreEvento(r) : "#2f4739")}
          soloLettura
          mostraAlloggio
          testoAttesa="da accettare"
        />
      </div>
    </main>
  );
}
