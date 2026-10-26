"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import CalendarButton from "../../components/CalendarButton";
import { useApp } from "../../components/AppProvider";
import { fmtData, traduciSotto, traduciVoci } from "../../../lib/i18n";

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
  const { t, lang } = useApp();
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

      const { data: p } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();

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
            <a href="/login">{t("c.vaiLogin")}</a>
          </p>
        </div>
      </main>
    );
  }

  const inCorso = richieste.filter((r) => ANNULLABILI.includes(r.stato));
  const chiuse = richieste
    .filter((r) => !ANNULLABILI.includes(r.stato))
    .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

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
            ? ` — ${r.tipo === "pulizie" ? traduciVoci(lang, r.descrizione) : r.descrizione}`
            : ""}
          {r.pax ? ` (${r.pax} ${t("c.persone")})` : ""}
          {r.durata_ore ? ` — ${t("c.durata")} ${r.durata_ore} ${t("c.ore")}` : ""}
          {r.tipo === "pulizie" && r.note ? ` — ${r.note}` : ""}
          {r.tipo === "pulizie" && r.accettata_il ? ` — ${t("ro.accettata")}` : ""}
        </p>
        {r.tipo === "pulizie" && ANNULLABILI.includes(r.stato) && (
          <details style={{ margin: "0.5rem 0" }}>
            <summary style={{ cursor: "pointer" }}>{t("ro.indica")}</summary>
            <form onSubmit={(e) => salvaCosaFare(e, r)} style={{ marginTop: "0.5rem" }}>
              {CHECKLIST_PULIZIE.map((voce) => (
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
                  {t("voce." + voce)}
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
