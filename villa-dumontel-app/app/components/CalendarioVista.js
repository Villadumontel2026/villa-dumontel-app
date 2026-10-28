"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";
import { fmtData, traduciSotto } from "../../lib/i18n";

const GIORNI_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const GIORNI_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const APERTI = ["nuova", "in gestione", "confermata"];

const iso = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const daIso = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const lunediDi = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const aggiungiGiorni = (d, n) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};

// Calendario con vista mese / settimana / giorno, usato da admin e ospiti.
// Props:
//  eventi: richieste (con data)   colore(ev): colore dell'evento
//  amministratore: true per admin (modifica diretta), false per ospite
//  onCambiato(): da chiamare dopo una modifica/annullamento per ricaricare i dati
export default function CalendarioVista({
  eventi,
  colore,
  amministratore = false,
  soloLettura = false,
  testoAttesa = null,
  mostraAlloggio = false,
  onCambiato,
}) {
  const { t, lang, voci, task } = useApp();
  const [vista, setVista] = useState("mese");
  const [cursore, setCursore] = useState(() => new Date());
  const [giornoSel, setGiornoSel] = useState(null);
  const [evSel, setEvSel] = useState(null);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("vd_vista_cal");
      if (v === "mese" || v === "settimana" || v === "giorno") setVista(v);
    } catch (e) {}
  }, []);

  function scegliVista(v) {
    setVista(v);
    setGiornoSel(null);
    setEvSel(null);
    try {
      window.localStorage.setItem("vd_vista_cal", v);
    } catch (e) {}
  }

  const oggi = iso(new Date());
  const inAttesa = (r) => r.stato === "nuova" || r.stato === "in gestione";
  const giorniSett = lang === "en" ? GIORNI_EN : GIORNI_IT;
  const loc = lang === "en" ? "en-GB" : "it-IT";

  const perGiorno = useMemo(() => {
    const m = {};
    eventi
      .filter((r) => r.data)
      .forEach((r) => {
        (m[r.data] = m[r.data] || []).push(r);
      });
    Object.values(m).forEach((arr) =>
      arr.sort((a, b) => String(a.ora || "").localeCompare(String(b.ora || "")))
    );
    return m;
  }, [eventi]);

  function sposta(dir) {
    setEvSel(null);
    if (vista === "mese") setCursore(new Date(cursore.getFullYear(), cursore.getMonth() + dir, 1));
    else if (vista === "settimana") setCursore(aggiungiGiorni(cursore, 7 * dir));
    else setCursore(aggiungiGiorni(cursore, dir));
  }

  let titolo;
  if (vista === "mese") {
    titolo = cursore.toLocaleDateString(loc, { month: "long", year: "numeric" });
  } else if (vista === "settimana") {
    const l = lunediDi(cursore);
    const d = aggiungiGiorni(l, 6);
    titolo =
      l.toLocaleDateString(loc, { day: "numeric", month: "short" }) +
      " – " +
      d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });
  } else {
    titolo = cursore.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  const celleMese = useMemo(() => {
    const primo = new Date(cursore.getFullYear(), cursore.getMonth(), 1);
    const offset = (primo.getDay() + 6) % 7;
    const n = new Date(cursore.getFullYear(), cursore.getMonth() + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= n; d++) out.push(new Date(cursore.getFullYear(), cursore.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursore]);

  const etichettaEv = (r) => (r.ora ? String(r.ora).slice(0, 5) + " " : "") + t("tipo." + r.tipo);

  // ---------- azioni ----------
  async function annullaEvento(r) {
    if (!window.confirm(t("ro.confermaAnnulla"))) return;
    setErrore(null);
    const { error } = await supabase.from("richieste").update({ stato: "annullata" }).eq("id", r.id);
    if (error) return setErrore(t("c.errore") + error.message);
    setEvSel(null);
    onCambiato && (await onCambiato());
  }

  async function salvaEvento(e, r) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    let error;
    if (amministratore) {
      const upd = {
        data: f.data.value || r.data,
        ora: f.ora.value || null,
        note: f.note.value || null,
      };
      if (f.pax) upd.pax = f.pax.value ? parseInt(f.pax.value, 10) : null;
      if (r.tipo === "pulizie") {
        const scelte = Array.from(f.querySelectorAll('input[name="voci"]:checked')).map((c) => c.value);
        upd.descrizione = scelte.length ? scelte.join(", ") : null;
      }
      if (f.durata_ore) upd.durata_ore = f.durata_ore.value ? parseFloat(f.durata_ore.value) : null;
      ({ error } = await supabase.from("richieste").update(upd).eq("id", r.id));
    } else {
      ({ error } = await supabase.rpc("modifica_richiesta_ospite", {
        p_id: r.id,
        p_data: f.data.value || r.data,
        p_ora: f.ora.value || null,
        p_pax: f.pax && f.pax.value ? parseInt(f.pax.value, 10) : r.pax || null,
        p_note: f.note.value || null,
      }));
      if (!error && r.tipo === "pulizie") {
        const scelte = Array.from(f.querySelectorAll('input[name="voci"]:checked')).map((c) => c.value);
        const nuova = scelte.length ? scelte.join(", ") : null;
        if (nuova !== (r.descrizione || null)) {
          ({ error } = await supabase.from("richieste").update({ descrizione: nuova }).eq("id", r.id));
        }
      }
    }
    if (error) return setErrore(t("c.errore") + error.message);
    setEvSel(null);
    onCambiato && (await onCambiato());
  }

  function dettaglio(r) {
    const aperto = APERTI.includes(r.stato);
    const selezionato = evSel === r.id;
    return (
      <div key={r.id} className="richiesta-item" style={{ borderLeft: "4px solid " + colore(r), paddingLeft: "0.6rem" }}>
        <div style={{ cursor: "pointer" }} onClick={() => setEvSel(selezionato ? null : r.id)}>
          <strong>
            {fmtData(lang, r.data, false)} {r.ora ? String(r.ora).slice(0, 5) : ""}
          </strong>{" "}
          &mdash; {t("tipo." + r.tipo)}
          <p className="descrizione" style={{ margin: "0.15rem 0 0" }}>
            {amministratore ? (r.famiglie?.nome || "") + " · " + (r.alloggi?.nome || "") : ""}
            {!amministratore && mostraAlloggio ? r.alloggi?.nome || "" : ""}
            {r.sotto_tipo ? ` ${r.tipo === "trasporto" ? r.sotto_tipo : traduciSotto(lang, r.sotto_tipo)}` : ""}
            {r.descrizione ? ` — ${r.tipo === "pulizie" ? voci(r.descrizione) : r.descrizione}` : ""}
            {r.pax ? ` (${r.pax} ${t("c.persone")})` : ""}
            {inAttesa(r) ? ` — ${testoAttesa || t("oh.inAttesa")}` : ""}
            {r.stato === "annullata" ? ` — ${t("stato.annullata")}` : ""}
          </p>
        </div>
        {aperto && !soloLettura && (
          <p style={{ margin: "0.4rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-light" style={{ padding: "0.3rem 0.8rem" }} onClick={() => setEvSel(selezionato ? null : r.id)}>
              {t("cv.modifica")}
            </button>
            <button type="button" className="btn btn-light" style={{ padding: "0.3rem 0.8rem" }} onClick={() => annullaEvento(r)}>
              {t("cv.annulla")}
            </button>
          </p>
        )}
        {aperto && !soloLettura && selezionato && (
          <form onSubmit={(e) => salvaEvento(e, r)} style={{ marginTop: "0.6rem" }}>
            <label>
              {t("f.data")}
              <input type="date" name="data" defaultValue={r.data || ""} required />
            </label>
            <label>
              {t("f.ora")}
              <input type="time" name="ora" defaultValue={r.ora ? String(r.ora).slice(0, 5) : ""} />
            </label>
            {r.tipo === "pulizie" && amministratore && (
              <label>
                {t("f.durata")}
                <input type="number" name="durata_ore" min="0.5" max="12" step="0.5" defaultValue={r.durata_ore || ""} />
              </label>
            )}
            {r.tipo === "pulizie" && (
              <div style={{ margin: "0.5rem 0" }}>
                <strong style={{ fontSize: "0.9rem" }}>{t("ro.indica")}</strong>
                {task.map((tk) => (
                  <label
                    key={tk.id || tk.nome_it}
                    style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <input
                      type="checkbox"
                      name="voci"
                      value={tk.nome_it}
                      defaultChecked={String(r.descrizione || "").includes(tk.nome_it)}
                      style={{ width: "auto", marginBottom: 0 }}
                    />
                    {lang === "en" ? tk.nome_en || tk.nome_it : tk.nome_it}
                  </label>
                ))}
              </div>
            )}
            {r.tipo !== "pulizie" && (
              <label>
                {t("f.persone")}
                <input type="number" name="pax" min="1" defaultValue={r.pax || ""} />
              </label>
            )}
            <label>
              {t("f.note")}
              <textarea name="note" defaultValue={r.note || ""}></textarea>
            </label>
            <p className="muted" style={{ fontSize: "0.85em" }}>
              {amministratore ? t("cv.avvisoAdmin") : t("cv.avvisoOspite")}
            </p>
            <button type="submit" className="btn">
              {t("c.salva")}
            </button>
          </form>
        )}
      </div>
    );
  }

  const elencoGiorno = (k) => {
    const ev = perGiorno[k] || [];
    return ev.length === 0 ? <p className="muted">{t("cv.nessuno")}</p> : ev.map(dettaglio);
  };

  const stileEv = (r) =>
    inAttesa(r)
      ? { border: "1px solid " + colore(r), color: colore(r), background: "white" }
      : { background: colore(r), color: "white" };

  return (
    <div>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        {[
          ["mese", "cv.mese"],
          ["settimana", "cv.settimana"],
          ["giorno", "cv.giorno"],
        ].map(([v, k]) => (
          <button
            key={v}
            type="button"
            className={vista === v ? "btn" : "btn btn-light"}
            style={{ padding: "0.35rem 0.9rem" }}
            onClick={() => scegliVista(v)}
          >
            {t(k)}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-light"
          style={{ padding: "0.35rem 0.9rem", marginLeft: "auto" }}
          onClick={() => {
            setCursore(new Date());
            setEvSel(null);
          }}
        >
          {t("cv.oggi")}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "0.5rem" }}>
        <button type="button" className="btn btn-light" style={{ padding: "0.35rem 0.8rem" }} onClick={() => sposta(-1)} aria-label="Precedente">
          &larr;
        </button>
        <strong style={{ textTransform: "capitalize", textAlign: "center" }}>{titolo}</strong>
        <button type="button" className="btn btn-light" style={{ padding: "0.35rem 0.8rem" }} onClick={() => sposta(1)} aria-label="Successivo">
          &rarr;
        </button>
      </div>

      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      {vista === "mese" && (
        <>
          <div className="cal-grid">
            {giorniSett.map((g) => (
              <div key={g} className="cal-head">
                {g}
              </div>
            ))}
            {celleMese.map((d, i) => {
              if (!d) return <div key={i} className="cal-cell vuota" />;
              const k = iso(d);
              const ev = perGiorno[k] || [];
              const sel = giornoSel === k;
              return (
                <div
                  key={i}
                  className={"cal-cell" + (k === oggi ? " oggi" : "") + (sel ? " sel" : "")}
                  onClick={() => {
                    setGiornoSel(sel ? null : k);
                    setEvSel(null);
                  }}
                >
                  <span className="cal-num">{d.getDate()}</span>
                  {ev.slice(0, 3).map((r) => (
                    <span key={r.id} className="cal-ev" style={stileEv(r)}>
                      {etichettaEv(r)}
                    </span>
                  ))}
                  {ev.length > 3 && <span className="cal-piu">+{ev.length - 3}</span>}
                </div>
              );
            })}
          </div>
          {giornoSel && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
              <strong>{fmtData(lang, giornoSel)}</strong>
              {elencoGiorno(giornoSel)}
            </div>
          )}
        </>
      )}

      {vista === "settimana" &&
        Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lunediDi(cursore), i)).map((d) => {
          const k = iso(d);
          return (
            <div key={k} style={{ marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--color-border)" }}>
              <strong style={{ color: k === oggi ? "var(--color-accent)" : "inherit" }}>{fmtData(lang, k)}</strong>
              {(perGiorno[k] || []).length === 0 ? (
                <p className="muted" style={{ margin: "0.2rem 0", fontSize: "0.85rem" }}>
                  &mdash;
                </p>
              ) : (
                (perGiorno[k] || []).map(dettaglio)
              )}
            </div>
          );
        })}

      {vista === "giorno" && <div>{elencoGiorno(iso(cursore))}</div>}

      <p className="muted" style={{ fontSize: "0.8rem", margin: "0.75rem 0 0" }}>
        {t("cv.legenda")}
      </p>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
            .cal-head { text-align: center; font-size: 0.72rem; color: var(--color-muted); padding-bottom: 2px; }
            .cal-cell { min-height: 76px; background: #fbfaf7; border: 1px solid var(--color-border); border-radius: 6px; padding: 3px; display: flex; flex-direction: column; gap: 2px; cursor: pointer; overflow: hidden; }
            .cal-cell.vuota { background: transparent; border: none; cursor: default; }
            .cal-cell.oggi { border-color: var(--color-accent); box-shadow: inset 0 0 0 1px var(--color-accent); }
            .cal-cell.sel { background: var(--color-primary-light); }
            .cal-num { font-size: 0.72rem; color: var(--color-muted); }
            .cal-ev { font-size: 0.62rem; line-height: 1.2; border-radius: 4px; padding: 1px 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .cal-piu { font-size: 0.62rem; color: var(--color-muted); }
            @media (max-width: 520px) { .cal-cell { min-height: 58px; } .cal-ev { font-size: 0.55rem; } }
          `,
        }}
      />
    </div>
  );
}
