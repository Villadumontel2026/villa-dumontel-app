"use client";

import { useEffect, useState } from "react";
import { zoneAlloggio } from "../../lib/zoneAlloggio";
import { traduciZone } from "../../lib/lingua";
import { useApp } from "./AppProvider";
import { fmtData, traduciSotto } from "../../lib/i18n";
import FotoRichiesta from "./FotoRichiesta";

// Finestra (pop-up) per vedere in modo chiaro un evento o una richiesta.
// azioneModifica: { href } oppure { onClick }  -> mostra la matita in alto
export default function PopupScheda({ titolo, sottotitolo, onChiudi, azioneModifica, larga = false, children }) {
  const { lang } = useApp();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onChiudi && onChiudi();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChiudi]);

  const matita = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
  const etMod = lang === "en" ? "Edit" : "Modifica";
  const etChiudi = lang === "en" ? "Close" : "Chiudi";

  return (
    <div
      onClick={onChiudi}
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "4vh 0.8rem", overflowY: "auto" }}
    >
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: larga ? 720 : 520, background: "#fff", margin: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, wordBreak: "break-word" }}>{titolo}</h2>
            {sottotitolo && <p className="muted" style={{ margin: "0.15rem 0 0" }}>{sottotitolo}</p>}
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            {azioneModifica && azioneModifica.href && (
              <a href={azioneModifica.href} className="btn btn-light" aria-label={etMod} title={etMod} style={{ padding: "0.4rem 0.6rem", display: "inline-flex", alignItems: "center" }}>
                {matita}
              </a>
            )}
            {azioneModifica && azioneModifica.onClick && (
              <button type="button" className="btn btn-light" aria-label={etMod} title={etMod} onClick={azioneModifica.onClick} style={{ padding: "0.4rem 0.6rem", display: "inline-flex", alignItems: "center" }}>
                {matita}
              </button>
            )}
            <button type="button" className="btn btn-light" onClick={onChiudi} aria-label={etChiudi} style={{ padding: "0.4rem 0.8rem" }}>
              &times;
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const STATO_CHIAVE = {
  nuova: "stato.inviata",
  "in gestione": "stato.inviata",
  confermata: "stato.prenotata",
  completata: "stato.completata",
  annullata: "stato.annullata",
};

// Riepilogo chiaro di una richiesta (trasporto, ristorante, attivita, pulizie)
export function RichiestaDettaglio({ r, admin = false, azioni = null }) {
  const { t, lang, voci } = useApp();
  const [zoneTutte, setZoneTutte] = useState([]);
  useEffect(() => {
    if (r.zone && lang !== "it") zoneAlloggio().then(setZoneTutte);
  }, [r.zone, lang]);
  const righe = [];
  const add = (k, v) => v !== null && v !== undefined && v !== "" && righe.push([k, v]);

  add(lang === "en" ? "When" : "Quando", (r.data ? fmtData(lang, r.data) : lang === "en" ? "Date to be defined" : "Data da definire") + (r.ora && !(r.tipo === "trasporto" && r.tipologia_trasporto === "aeroporto") ? " · " + String(r.ora).slice(0, 5) : ""));
  if (admin) add(lang === "en" ? "Guests" : "Famiglia", [r.famiglie?.nome, r.alloggi?.nome].filter(Boolean).join(" · "));
  else add(lang === "en" ? "Apartment" : "Alloggio", r.alloggi?.nome);
  if (r.sotto_tipo) add(lang === "en" ? "Type" : "Tipo", r.tipo === "trasporto" ? r.sotto_tipo : traduciSotto(lang, r.sotto_tipo));
  if (r.tipo === "trasporto" && r.orario_tipo && r.tipologia_trasporto !== "aeroporto") add(lang === "en" ? "Time refers to" : "L'orario è di", r.orario_tipo === "arrivo" ? (lang === "en" ? "arrival" : "arrivo") : (lang === "en" ? "departure" : "partenza"));
  if (r.tipo === "trasporto" && r.tipologia_trasporto === "aeroporto" && r.ora) {
    add(r.orario_tipo === "arrivo" ? (lang === "en" ? "Flight arrival" : "Arrivo del volo") : (lang === "en" ? "Flight departure" : "Partenza del volo"), String(r.ora).slice(0, 5));
  }
  if (r.tipo === "trasporto" && r.navetta_partenza) add(lang === "en" ? "Shuttle departure" : "Partenza navetta", String(r.navetta_partenza).slice(0, 5));
  if (r.tipo === "trasporto" && r.navetta_arrivo) add(lang === "en" ? "Shuttle arrival" : "Arrivo navetta", String(r.navetta_arrivo).slice(0, 5));
  if (r.zone) add(lang === "en" ? "Areas" : "Zone", traduciZone(lang, r.zone, zoneTutte));
  if (r.descrizione) add(r.tipo === "pulizie" ? (lang === "en" ? "To do" : "Cosa fare") : (lang === "en" ? "Details" : "Dettagli"), r.tipo === "pulizie" ? voci(r.descrizione) : r.descrizione);
  if (r.pax) add(t("f.persone"), `${r.pax}`);
  if (r.nome_prenotazione) add(t("f.nomePren"), r.nome_prenotazione);
  if (r.durata_ore) add(t("c.durata"), `${r.durata_ore} ${t("c.ore")}`);
  if (admin && r.tipo === "pulizie" && r.collaboratore_id === null) add(lang === "en" ? "Cleaner" : "Collaboratrice", lang === "en" ? "not assigned" : "da assegnare");

  const chiave = STATO_CHIAVE[r.stato];
  return (
    <div>
      <p style={{ margin: "0 0 0.6rem" }}>
        <span className={"badge badge-" + String(r.stato).replace(" ", "-")}>
          {admin ? r.stato : chiave ? t(chiave) : r.stato}
        </span>{" "}
        <strong>{t("tipo." + r.tipo)}</strong>
      </p>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.35rem 0.9rem" }}>
        {righe.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt className="muted" style={{ fontSize: "0.88em" }}>{k}</dt>
            <dd style={{ margin: 0, wordBreak: "break-word" }}>{v}</dd>
          </div>
        ))}
      </dl>
      {r.tipo === "pulizie" && (
        <FotoRichiesta richiestaId={r.id} famigliaId={r.famiglia_id} puoAggiungere={admin || r.stato !== "annullata"} />
      )}
      {r.note && (
        <div style={{ marginTop: "0.8rem", background: "#faf7ef", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
          <strong style={{ fontSize: "0.88em" }}>{t("f.note")}</strong>
          <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{r.note}</p>
        </div>
      )}
      {r.proposta_data && (
        <p style={{ marginTop: "0.8rem", background: "#fff6e0", borderRadius: 8, padding: "0.5rem 0.8rem" }}>
          {lang === "en" ? "Proposed change: " : "Proposta di modifica: "}
          <strong>
            {fmtData(lang, r.proposta_data, false)}
            {r.proposta_ora ? " " + String(r.proposta_ora).slice(0, 5) : ""}
          </strong>
        </p>
      )}
      {r.cancellazione_richiesta && (
        <div style={{ marginTop: "0.8rem", background: "#fde9d8", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
          <strong style={{ fontSize: "0.88em" }}>
            {admin ? "Il cliente chiede di cancellare" : lang === "en" ? "Cancellation requested, waiting for confirmation" : "Cancellazione richiesta, in attesa di conferma"}
          </strong>
          {r.cancellazione_nota && <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{r.cancellazione_nota}</p>}
        </div>
      )}
      {!r.cancellazione_richiesta && r.cancellazione_risposta && (
        <p className="muted" style={{ marginTop: "0.8rem", fontSize: "0.9em" }}>
          {lang === "en" ? "Cancellation not accepted: " : "Cancellazione non accettata: "}
          {r.cancellazione_risposta}
        </p>
      )}
      {r.stato === "annullata" && (r.cancellazione_da || r.cancellazione_nota) && (
        <div style={{ marginTop: "0.8rem", background: "#eee", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
          <strong style={{ fontSize: "0.88em" }}>
            {lang === "en" ? "Cancelled" : "Cancellata"}
            {r.cancellazione_da
              ? lang === "en"
                ? " by " + { admin: "Villa Dumontel", ospite: "the guest", collaboratore: "the cleaner" }[r.cancellazione_da]
                : " da " + { admin: "Villa Dumontel", ospite: "il cliente", collaboratore: "la collaboratrice" }[r.cancellazione_da]
              : ""}
            {r.cancellazione_il ? " · " + fmtData(lang, String(r.cancellazione_il).slice(0, 10)) : ""}
          </strong>
          {r.cancellazione_nota && <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{r.cancellazione_nota}</p>}
        </div>
      )}
      {azioni && <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>{azioni}</div>}
    </div>
  );
}
