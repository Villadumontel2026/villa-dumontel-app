"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { fmtData, fmtCreata } from "../../lib/i18n";
import CalendarioVista from "../components/CalendarioVista";
import AvvisiBox from "../components/AvvisiBox";
import { espandiEventi, coloreEvento } from "../../lib/eventi";
import AppartamentiBox from "../components/AppartamentiBox";

const COLORI = ["#2f4739", "#2b6a9e", "#a2562c", "#7a4b94"];
const iso = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

export default function AdminHome() {
  const { t, lang } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
  const [richieste, setRichieste] = useState([]);
  const [generiche, setGeneriche] = useState([]);
  const [filtro, setFiltro] = useState("tutte");
  const [eventiCal, setEventiCal] = useState([]);

  async function ricarica() {
    const { data: ric } = await supabase
      .from("richieste")
      .select("*, alloggi(nome), famiglie(nome)")
      .neq("stato", "annullata")
      .order("data", { ascending: true });
    setRichieste(ric || []);
    const { data: evs } = await supabase.from("eventi").select("*").order("data_inizio", { ascending: true }).limit(1000);
    setEventiCal(evs || []);
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
      const { data: profilo } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!profilo || profilo.ruolo !== "admin") {
        setErroreAccesso("admin");
        setCaricamento(false);
        return;
      }
      const { data: fam } = await supabase.from("famiglie").select("id, nome, test").order("id");
      setFamiglie(fam || []);
      const { data: ric } = await supabase
        .from("richieste")
        .select("*, alloggi(nome), famiglie(nome)")
        .neq("stato", "annullata")
        .order("data", { ascending: true });
      setRichieste(ric || []);
      const { data: evs } = await supabase.from("eventi").select("*").order("data_inizio", { ascending: true }).limit(1000);
      setEventiCal(evs || []);
      const { data: gen } = await supabase
        .from("richieste_generiche")
        .select("*, famiglie(nome)")
        .eq("stato", "da fare")
        .order("scadenza", { ascending: true, nullsFirst: false });
      setGeneriche(gen || []);
      setCaricamento(false);
    }
    carica();
  }, []);

  const colore = (famigliaId) => {
    const i = famiglie.findIndex((f) => f.id === famigliaId);
    return COLORI[(i < 0 ? 0 : i) % COLORI.length];
  };

  const visibili = richieste.filter(
    (r) => r.data && (filtro === "tutte" || String(r.famiglia_id) === filtro)
  );

  const oggi = iso(new Date());
  const prossimi = visibili
    .filter((r) => r.data >= oggi && r.stato !== "completata")
    .sort(
      (a, b) =>
        String(a.data).localeCompare(String(b.data)) ||
        String(a.ora || "").localeCompare(String(b.ora || ""))
    )
    .slice(0, 10);

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
              : "Questa pagina e' riservata all'amministratore."}
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

  const nuove = richieste.filter((r) => r.stato === "nuova");
  const pulizieDaAssegnare = richieste.filter(
    (r) => r.tipo === "pulizie" && !r.collaboratore_id && ["nuova", "in gestione", "confermata"].includes(r.stato)
  );
  const proposte = richieste.filter((r) => r.proposta_data);
  const inAttesa = (r) => r.stato === "nuova" || r.stato === "in gestione";

  const dettaglio = (r) => (
    <div key={r.id} className="richiesta-item">
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: 999,
          background: colore(r.famiglia_id),
          marginRight: 6,
        }}
      />
      <strong>
        {fmtData(lang, r.data, false)} {r.ora ? String(r.ora).slice(0, 5) : ""}
      </strong>{" "}
      &mdash; {t("tipo." + r.tipo)}
      <p className="descrizione" style={{ margin: "0.15rem 0 0" }}>
        {r.famiglie?.nome} · {r.alloggi?.nome}
        {r.descrizione ? ` — ${r.descrizione}` : ""}
        {inAttesa(r) ? " (da confermare)" : ""}
        {r.proposta_data ? " (proposta inviata)" : ""}
      </p>
      {r.creato_il && <span className="creata">{fmtCreata("it", r.creato_il)}</span>}
    </div>
  );

  const nuoveLista = nuove.slice(0, 6);
  const nulla = nuove.length === 0 && pulizieDaAssegnare.length === 0 && proposte.length === 0 && generiche.length === 0;

  return (
    <main>
      <h1>Home</h1>

      <AvvisiBox tipo="admin" />

      {/* Da tenere d'occhio */}
      <div className="card" style={{ marginBottom: "1rem", background: nulla ? "#eef7ef" : "#fff6e0" }}>
        <h2 style={{ marginTop: 0 }}>Da tenere d'occhio</h2>
        {nulla && <p className="muted" style={{ margin: 0 }}>Tutto a posto: nessuna richiesta in sospeso.</p>}

        {nuove.length > 0 && (
          <>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>{nuove.length}</strong> {nuove.length === 1 ? "nuova richiesta da confermare" : "nuove richieste da confermare"}
            </p>
            {nuoveLista.map(dettaglio)}
          </>
        )}
        {pulizieDaAssegnare.length > 0 && (
          <p style={{ margin: "0.4rem 0" }}>
            <strong>{pulizieDaAssegnare.length}</strong> pulizie senza collaboratrice
          </p>
        )}
        {proposte.length > 0 && (
          <p style={{ margin: "0.4rem 0" }}>
            <strong>{proposte.length}</strong> proposte di modifica in attesa di risposta
          </p>
        )}

        {generiche.length > 0 && (
          <>
            <p style={{ margin: "0.6rem 0 0.2rem" }}>
              <strong>{generiche.length}</strong> {generiche.length === 1 ? "promemoria aperto" : "promemoria aperti"}
            </p>
            {generiche.slice(0, 5).map((g) => {
              const giorni = g.scadenza ? Math.round((new Date(g.scadenza) - new Date(oggi)) / 86400000) : null;
              return (
                <div
                  key={g.id}
                  style={{
                    background: giorni !== null && giorni < 0 ? "#fde2e2" : giorni !== null && giorni <= 14 ? "#ffffff" : "transparent",
                    borderRadius: 8,
                    padding: "0.3rem 0.5rem",
                  }}
                >
                  <strong>{g.testo}</strong>
                  <span className="muted" style={{ fontSize: "0.85em" }}>
                    {" · "}
                    {g.famiglie?.nome || "Generale"}
                    {g.scadenza ? ` — entro il ${g.scadenza}` : ""}
                  </span>
                </div>
              );
            })}
          </>
        )}

        <p style={{ margin: "0.7rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a href="/richieste" className="btn">
            Apri le richieste
          </a>
        </p>
      </div>

      <AppartamentiBox famiglie={famiglie.filter((x) => !x.test)} eventi={eventiCal} />

      {/* Prossimi appuntamenti */}
      <h2>Prossimi appuntamenti</h2>
      <div className="card" style={{ marginBottom: "1rem" }}>
        {prossimi.length === 0 && <p className="muted">Nessun appuntamento in programma.</p>}
        {prossimi.slice(0, 5).map(dettaglio)}
      </div>

      {/* Calendario completo (chiuso di default) */}
      <details className="card" style={{ marginBottom: "2rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Calendario completo</summary>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.8rem 0" }}>
          <button
            type="button"
            className={filtro === "tutte" ? "btn" : "btn btn-light"}
            onClick={() => setFiltro("tutte")}
            style={{ padding: "0.4rem 0.9rem" }}
          >
            Tutte
          </button>
          {famiglie.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(String(f.id))}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: 8,
                cursor: "pointer",
                border: "1px solid " + colore(f.id),
                background: filtro === String(f.id) ? colore(f.id) : "transparent",
                color: filtro === String(f.id) ? "white" : colore(f.id),
                fontSize: "0.9rem",
              }}
            >
              {f.nome}
            </button>
          ))}
        </div>
        <p style={{ marginTop: 0 }}>
          <a href="/calendario/evento" className="btn">
            Aggiungi un evento
          </a>
        </p>
        <CalendarioVista
          eventi={[
            ...visibili,
            ...espandiEventi(
              eventiCal.filter(
                (e) => filtro === "tutte" || e.per_tipo === "villa" || String(e.per_famiglia_id) === filtro
              ),
              lang
            ),
          ]}
          colore={(r) => (r.tipo === "evento" ? coloreEvento(r) : colore(r.famiglia_id))}
          amministratore
          onCambiato={ricarica}
        />
      </details>
    </main>
  );
}
