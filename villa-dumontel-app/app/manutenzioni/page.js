"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { fmtCreata } from "../../lib/i18n";
import { traduciZone } from "../../lib/lingua";
import PopupScheda from "../components/PopupEvento";
import FormManutenzione from "../components/FormManutenzione";
import FotoRichiesta from "../components/FotoRichiesta";
import AvvisiBox from "../components/AvvisiBox";

const STATI = {
  segnalata: ["Segnalata", "Reported"],
  in_valutazione: ["In valutazione", "Under review"],
  info_richieste: ["Servono informazioni", "More information needed"],
  preventivo: ["Preventivo da confermare", "Quote awaiting approval"],
  approvata: ["Approvata", "Approved"],
  in_corso: ["Lavori in corso", "Work in progress"],
  completata: ["Completata", "Completed"],
  rifiutata: ["Preventivo rifiutato", "Quote declined"],
  annullata: ["Annullata", "Cancelled"],
};
const COLORI = {
  segnalata: "#fff6e0",
  in_valutazione: "#eef2f9",
  info_richieste: "#fde9d8",
  preventivo: "#fde9d8",
  approvata: "#e4f1e6",
  in_corso: "#eef2f9",
  completata: "#e4f1e6",
  rifiutata: "#eee",
  annullata: "#eee",
};
const APERTE = ["segnalata", "in_valutazione", "info_richieste", "preventivo", "approvata", "in_corso"];

const euro = (n) => (n === null || n === undefined ? "" : "€ " + Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function ManutenzioniPage() {
  const { lang, ruolo } = useApp();
  const en = lang === "en";
  const [caricamento, setCaricamento] = useState(true);
  const [accesso, setAccesso] = useState(true);
  const [profilo, setProfilo] = useState(null);
  const [lista, setLista] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
  const [zone, setZone] = useState([]);
  const [aperta, setAperta] = useState(null);
  const [nuova, setNuova] = useState(false);
  const [mostraChiuse, setMostraChiuse] = useState(false);
  const [errore, setErrore] = useState(null);

  async function carica() {
    const { data } = await supabase
      .from("manutenzioni")
      .select("*, alloggi(nome), famiglie(nome)")
      .order("creato_il", { ascending: false });
    setLista(data || []);
    return data || [];
  }

  useEffect(() => {
    async function inizia() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setAccesso(false);
        setCaricamento(false);
        return;
      }
      const { data: p } = await supabase.from("profili").select("*").eq("id", session.user.id).single();
      setProfilo(p);
      let qa = supabase.from("alloggi").select("*");
      if (p && p.ruolo === "ospite" && p.famiglia_id) qa = qa.eq("famiglia_id", p.famiglia_id);
      const { data: a } = await qa;
      setAlloggi(a || []);
      const { data: z } = await supabase.from("zone_alloggio").select("*").order("ordine", { ascending: true });
      setZone(z || []);
      const dati = await carica();
      const id = new URLSearchParams(window.location.search).get("id");
      if (id) setAperta(dati.find((m) => String(m.id) === id) || null);
      setCaricamento(false);
    }
    inizia();
  }, []);

  const corrente = aperta ? lista.find((m) => m.id === aperta.id) || aperta : null;

  async function aggiorna(id, campi) {
    setErrore(null);
    const { error } = await supabase.from("manutenzioni").update(campi).eq("id", id);
    if (error) return setErrore((en ? "Error: " : "Errore: ") + error.message);
    await carica();
  }

  async function azioneOspite(id, azione, testo) {
    setErrore(null);
    const { data, error } = await supabase.rpc("manutenzione_ospite_azione", { p_id: id, p_azione: azione, p_testo: testo || null });
    if (error || data !== "ok") return setErrore((en ? "Error: " : "Errore: ") + (error ? error.message : data));
    await carica();
  }

  if (caricamento) return <main><p>{en ? "Loading..." : "Caricamento..."}</p></main>;
  if (!accesso || !profilo) {
    return (
      <main>
        <div className="card">
          <p>{en ? "Please log in." : "Devi accedere."}</p>
          <p><a href="/login" className="btn">Login</a></p>
        </div>
      </main>
    );
  }

  const admin = ruolo === "admin";
  const ospite = ruolo === "ospite";
  const visibili = lista.filter((m) => mostraChiuse || APERTE.includes(m.stato));
  const nChiuse = lista.filter((m) => !APERTE.includes(m.stato)).length;
  const L = (k) => (STATI[k] ? STATI[k][en ? 1 : 0] : k);

  const bollino = (m) => (
    <span style={{ background: COLORI[m.stato] || "#eee", borderRadius: 999, padding: "0.1rem 0.6rem", fontSize: "0.85em", whiteSpace: "nowrap" }}>{L(m.stato)}</span>
  );

  function dettaglio(m) {
    return (
      <div>
        <p style={{ margin: "0 0 0.6rem" }}>{bollino(m)}</p>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.35rem 0.9rem" }}>
          {admin && <><dt className="muted">{en ? "Guests" : "Famiglia"}</dt><dd style={{ margin: 0 }}>{[m.famiglie?.nome, m.alloggi?.nome].filter(Boolean).join(" · ")}</dd></>}
          {!admin && m.alloggi?.nome && <><dt className="muted">{en ? "Apartment" : "Alloggio"}</dt><dd style={{ margin: 0 }}>{m.alloggi.nome}</dd></>}
          {m.zone && <><dt className="muted">{en ? "Where" : "Dove"}</dt><dd style={{ margin: 0 }}>{traduciZone(lang, m.zone, zone)}</dd></>}
          <dt className="muted">{en ? "Reported" : "Segnalata"}</dt><dd style={{ margin: 0 }}>{fmtCreata(en ? "en" : "it", m.creato_il)}</dd>
          {m.prezzo !== null && <><dt className="muted">{en ? "Quote" : "Preventivo"}</dt><dd style={{ margin: 0 }}><strong>{euro(m.prezzo)}</strong></dd></>}
        </dl>
        {m.note && (
          <div style={{ marginTop: "0.8rem", background: "#faf7ef", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
            <strong style={{ fontSize: "0.88em" }}>{en ? "Notes" : "Note"}</strong>
            <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{m.note}</p>
          </div>
        )}
        <FotoRichiesta manutenzioneId={m.id} famigliaId={m.famiglia_id} puoAggiungere={APERTE.includes(m.stato) && (admin || ospite || m.segnalata_da === profilo.id)} />
        {m.richiesta_info && (
          <div style={{ marginTop: "0.6rem", background: "#fde9d8", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
            <strong style={{ fontSize: "0.88em" }}>{en ? "Question" : "Richiesta di informazioni"}</strong>
            <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{m.richiesta_info}</p>
          </div>
        )}
        {m.risposta_info && (
          <div style={{ marginTop: "0.6rem", background: "#eef2f9", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
            <strong style={{ fontSize: "0.88em" }}>{en ? "Reply" : "Risposta"}</strong>
            <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{m.risposta_info}</p>
          </div>
        )}
        {m.note_admin && (
          <div style={{ marginTop: "0.6rem", background: "#eef7ef", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
            <strong style={{ fontSize: "0.88em" }}>{en ? "Note from Villa Dumontel" : "Nota di Villa Dumontel"}</strong>
            <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{m.note_admin}</p>
          </div>
        )}
        {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

        {ospite && m.stato === "info_richieste" && (
          <form
            style={{ marginTop: "0.8rem" }}
            onSubmit={(e) => {
              e.preventDefault();
              azioneOspite(m.id, "rispondi", e.target.risposta.value);
            }}
          >
            <label>
              {en ? "Your reply" : "La tua risposta"}
              <textarea name="risposta" required></textarea>
            </label>
            <button type="submit" className="btn">{en ? "Send reply" : "Invia risposta"}</button>
          </form>
        )}
        {ospite && m.stato === "preventivo" && (
          <div style={{ marginTop: "0.8rem" }}>
            <p style={{ margin: "0 0 0.5rem" }}>
              {en ? "Do you approve this quote?" : "Confermi questo preventivo?"} <strong>{euro(m.prezzo)}</strong>
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={() => azioneOspite(m.id, "approva")}>{en ? "Approve" : "Approva"}</button>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  const c = window.prompt(en ? "Reason (optional)" : "Motivo (facoltativo)", "");
                  if (c !== null) azioneOspite(m.id, "rifiuta", c);
                }}
              >
                {en ? "Decline" : "Rifiuta"}
              </button>
            </div>
          </div>
        )}
        {ospite && ["segnalata", "in_valutazione", "info_richieste", "preventivo"].includes(m.stato) && (
          <p style={{ marginTop: "0.8rem" }}>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                if (window.confirm(en ? "Cancel this request?" : "Annullare questa richiesta?")) azioneOspite(m.id, "annulla");
              }}
            >
              {en ? "Cancel request" : "Annulla richiesta"}
            </button>
          </p>
        )}

        {admin && (
          <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px dashed var(--color-border)" }}>
            <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>Gestione (solo admin)</p>
            <form
              key={m.id + m.aggiornato_il}
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.target;
                aggiorna(m.id, {
                  stato: f.stato.value,
                  note_admin: f.note_admin.value.trim() || null,
                });
              }}
            >
              <label>
                Stato
                <select name="stato" defaultValue={m.stato}>
                  {Object.keys(STATI).map((k) => (
                    <option key={k} value={k}>{STATI[k][0]}</option>
                  ))}
                </select>
              </label>
              <label>
                Nota visibile al cliente (facoltativa)
                <textarea name="note_admin" defaultValue={m.note_admin || ""}></textarea>
              </label>
              <button type="submit" className="btn">Aggiorna stato e nota</button>
            </form>

            <form
              key={"i" + m.id + m.aggiornato_il}
              style={{ marginTop: "1rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                aggiorna(m.id, { richiesta_info: e.target.richiesta_info.value.trim(), stato: "info_richieste" });
              }}
            >
              <label>
                Chiedi maggiori informazioni al cliente
                <textarea name="richiesta_info" required defaultValue={m.stato === "info_richieste" ? m.richiesta_info || "" : ""}></textarea>
              </label>
              <button type="submit" className="btn btn-light">Invia la domanda</button>
            </form>

            <form
              key={"p" + m.id + m.aggiornato_il}
              style={{ marginTop: "1rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                const v = parseFloat(String(e.target.prezzo.value).replace(",", "."));
                if (!(v >= 0)) return;
                aggiorna(m.id, { prezzo: v, stato: "preventivo" });
              }}
            >
              <label>
                Prezzo del lavoro (€), in attesa della conferma del cliente
                <input type="number" name="prezzo" step="0.01" min="0" required defaultValue={m.prezzo ?? ""} />
              </label>
              <button type="submit" className="btn btn-light">Invia il preventivo</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <main>
      <AvvisiBox tipo={admin ? "admin" : ospite ? "famiglia" : "collaboratore"} id={admin ? null : ospite ? profilo.famiglia_id : profilo.collaboratore_id} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>{en ? "Maintenance" : "Manutenzioni"}</h1>
        <button type="button" className="btn" onClick={() => setNuova(true)}>
          {en ? "+ Report a problem" : "+ Segnala un problema"}
        </button>
      </div>

      {visibili.length === 0 && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>{en ? "No maintenance requests." : "Nessuna manutenzione."}</p>
        </div>
      )}
      <div style={{ display: "grid", gap: "0.7rem" }}>
        {visibili.map((m) => (
          <div key={m.id} className="card" style={{ cursor: "pointer" }} onClick={() => setAperta(m)}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              <strong>{m.titolo || m.zone || "—"}</strong>
              {bollino(m)}
            </div>
            <p className="descrizione" style={{ margin: "0.2rem 0 0" }}>
              {admin ? [m.famiglie?.nome, m.alloggi?.nome].filter(Boolean).join(" · ") + (m.zone ? " — " : "") : ""}
              {traduciZone(lang, m.zone, zone) || ""}
              {m.prezzo !== null ? " · " + euro(m.prezzo) : ""}
            </p>
            <span className="creata">{fmtCreata(en ? "en" : "it", m.creato_il)}</span>
          </div>
        ))}
      </div>
      {nChiuse > 0 && (
        <p style={{ marginTop: "1rem" }}>
          <button type="button" className="btn btn-light" onClick={() => setMostraChiuse(!mostraChiuse)}>
            {mostraChiuse ? (en ? "Hide closed" : "Nascondi le chiuse") : (en ? `Show closed (${nChiuse})` : `Mostra le chiuse (${nChiuse})`)}
          </button>
        </p>
      )}

      {corrente && (
        <PopupScheda titolo={corrente.titolo || (en ? "Maintenance" : "Manutenzione")} sottotitolo={L(corrente.stato)} onChiudi={() => { setAperta(null); setErrore(null); }} larga>
          {dettaglio(corrente)}
        </PopupScheda>
      )}
      {nuova && (
        <PopupScheda titolo={en ? "Report a problem" : "Segnala un problema"} onChiudi={() => setNuova(false)} larga>
          <FormManutenzione
            alloggi={alloggi}
            zone={zone}
            onFatto={async () => {
              await carica();
            }}
          />
        </PopupScheda>
      )}
    </main>
  );
}
