"use client";

import { useEffect, useState } from "react";
import { applicaVista } from "../../../lib/vista";
import { supabase } from "../../../lib/supabaseClient";
import CalendarButton from "../../components/CalendarButton";
import { useApp } from "../../components/AppProvider";
import { fmtData, fmtCreata, traduciSotto } from "../../../lib/i18n";

const ANNULLABILI = ["nuova", "in gestione", "confermata"];

const CHECKLIST_PULIZIE = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

function chiaveStato(stato) {
  if (stato === "nuova" || stato === "in gestione") return "stato.inviata";
  if (stato === "confermata") return "stato.prenotata";
  if (stato === "completata") return "stato.completata";
  if (stato === "annullata") return "stato.annullata";
  return null;
}

export default function RichiesteOspitePage() {
  const { t, lang, task, voci } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famigliaId, setFamigliaId] = useState(null);
  const [richieste, setRichieste] = useState([]);
  const [errore, setErrore] = useState(null);

  async function carica(famiglia_id) {
    const { data } = await supabase
      .from("richieste")
      .select("*")
      .eq("famiglia_id", famiglia_id)
      .order("data", { ascending: true });
    setRichieste(data || []);
  }

  useEffect(() => {
    async function inizia() {
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
      const p = applicaVista(pRaw);

      if (!p || p.ruolo !== "ospite" || !p.famiglia_id) {
        setErroreAccesso("ospiti");
        setCaricamento(false);
        return;
      }

      setFamigliaId(p.famiglia_id);
      await carica(p.famiglia_id);
      setCaricamento(false);
    }
    inizia();
  }, []);

  async function salvaCosaFare(e, r) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const voci = Array.from(f.querySelectorAll('input[name="voci"]:checked')).map((c) => c.value);
    const { error } = await supabase
      .from("richieste")
      .update({ descrizione: voci.length ? voci.join(", ") : null, note: f.note.value || null })
      .eq("id", r.id);
    if (error) {
      setErrore(t("c.errore") + error.message);
      return;
    }
    await carica(famigliaId);
  }

  async function rispondi(id, accetta) {
    setErrore(null);
    const { error } = await supabase.rpc("rispondi_proposta", { p_id: id, p_accetta: accetta });
    if (error) {
      setErrore(t("c.errore") + error.message);
      return;
    }
    await carica(famigliaId);
  }

  async function annulla(id) {
    if (!window.confirm(t("ro.confermaAnnulla"))) return;
    setErrore(null);
    const { error } = await supabase
      .from("richieste")
      .update({ stato: "annullata" })
      .eq("id", id);
    if (error) {
      setErrore(t("c.errore") + error.message);
      return;
    }
    await carica(famigliaId);
  }

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
          <p>{erroreAccesso === "login" ? t("c.loginRichiesto") : t("c.soloOspiti")}</p>
          <p>
            <a href="/login" className="btn">
              {t("c.vaiLogin")}
            </a>
          </p>
        </div>
      </main>
    );
  }

  const perCreazione = (a, b) => String(b.creato_il || "").localeCompare(String(a.creato_il || ""));
  const inCorso = richieste.filter((r) => ANNULLABILI.includes(r.stato)).sort(perCreazione);
  const chiuse = richieste
    .filter((r) => !ANNULLABILI.includes(r.stato))
    .sort(perCreazione);

  function riga(r) {
    return (
      <div key={r.id} className="richiesta-item">
        <span
          className={
            "badge " +
            (r.stato === "confermata"
              ? "badge-confermata"
              : r.stato === "completata"
              ? "badge-completata"
              : "badge-nuova")
          }
        >
          {chiaveStato(r.stato) ? t(chiaveStato(r.stato)) : r.stato}
        </span>{" "}
        <strong>{t("tipo." + r.tipo)}</strong>
        <p className="descrizione">
          {fmtData(lang, r.data)} {r.ora ? String(r.ora).slice(0, 5) : ""}
          {r.sotto_tipo ? ` — ${traduciSotto(lang, r.sotto_tipo)}` : ""}
          {r.descrizione
            ? ` — ${r.tipo === "pulizie" ? voci(r.descrizione) : r.descrizione}`
            : ""}
          {r.pax ? ` (${r.pax} ${t("c.persone")})` : ""}
          {r.durata_ore ? ` — ${t("c.durata")} ${r.durata_ore} ${t("c.ore")}` : ""}
          {r.tipo === "pulizie" && r.note ? ` — ${r.note}` : ""}
          {r.tipo === "pulizie" && r.accettata_il ? ` — ${t("ro.accettata")}` : ""}
        </p>
        {r.creato_il && <span className="creata">{fmtCreata(lang, r.creato_il)}</span>}
        {r.proposta_data && (
          <div
            style={{ background: "#fff6e0", padding: "0.7rem 0.9rem", borderRadius: 10, margin: "0.5rem 0" }}
          >
            <strong>{t("pm.titolo")}</strong>
            <p style={{ margin: "0.3rem 0" }}>
              {t("pm.da")} {fmtData(lang, r.data, false)}
              {r.ora ? " " + String(r.ora).slice(0, 5) : ""} &rarr; {t("pm.a")}{" "}
              <strong>
                {fmtData(lang, r.proposta_data, false)}
                {r.proposta_ora ? " " + String(r.proposta_ora).slice(0, 5) : ""}
              </strong>
            </p>
            {r.proposta_note && <p style={{ margin: "0.3rem 0" }}>{r.proposta_note}</p>}
            <p style={{ margin: "0.5rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={() => rispondi(r.id, true)}>
                {t("pm.accetta")}
              </button>
              <button type="button" className="btn btn-light" onClick={() => rispondi(r.id, false)}>
                {t("pm.rifiuta")}
              </button>
            </p>
          </div>
        )}
        {r.tipo === "pulizie" && ANNULLABILI.includes(r.stato) && (
          <details style={{ margin: "0.5rem 0" }}>
            <summary style={{ cursor: "pointer" }}>{t("ro.indica")}</summary>
            <form onSubmit={(e) => salvaCosaFare(e, r)} style={{ marginTop: "0.5rem" }}>
              {task.map((tk) => tk.nome_it).map((voce) => (
                <label
                  key={voce}
                  style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <input
                    type="checkbox"
                    name="voci"
                    value={voce}
                    defaultChecked={String(r.descrizione || "").includes(voce)}
                    style={{ width: "auto", marginBottom: 0 }}
                  />
                  {lang === "en" ? (task.find((x) => x.nome_it === voce)?.nome_en || voce) : voce}
                </label>
              ))}
              <label>
                {t("ro.noteChi")}
                <textarea name="note" defaultValue={r.note || ""}></textarea>
              </label>
              <button type="submit" className="btn">
                {t("c.salva")}
              </button>
            </form>
          </details>
        )}
        {ANNULLABILI.includes(r.stato) && (
          <div className="stato-actions">
            {(r.stato === "confermata" || r.tipo === "pulizie") && <CalendarButton richiesta={r} />}{" "}
            <button onClick={() => annulla(r.id)}>{t("ro.annulla")}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main>
      <h1>{t("ro.titolo")}</h1>

      <p style={{ marginBottom: "1.5rem" }}>
        <a href="/ospite/prenota" className="btn">
          {t("nav.prenota")}
        </a>
      </p>

      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}

      <h2>{t("ro.inCorso")}</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {inCorso.length === 0 && <p className="muted">{t("ro.nessuna")}</p>}
        {inCorso.map(riga)}
      </div>

      {chiuse.length > 0 && (
        <details className="card">
          <summary className="muted" style={{ cursor: "pointer" }}>
            {t("ro.chiuse")} ({chiuse.length})
          </summary>
          <div style={{ marginTop: "0.75rem" }}>{chiuse.map(riga)}</div>
        </details>
      )}
    </main>
  );
}
