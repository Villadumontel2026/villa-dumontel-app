"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { applicaVista } from "../../../lib/vista";
import { useApp } from "../../components/AppProvider";
import { coloreTipologia } from "../../../lib/cantina";
import MaturitaIndicatore from "../../components/MaturitaIndicatore";
import SelettoreNumero from "../../components/SelettoreNumero";
import { fmtData } from "../../../lib/i18n";

const TX = {
  it: {
    titolo: "Vini della cantina",
    intro: "Scegli le bottiglie che vuoi acquistare. Invii una richiesta: dopo la conferma riceverai il totale.",
    cerca: "Cerca un vino",
    nessuno: "Al momento non ci sono vini disponibili.",
    disp: "disponibili",
    bott: "bottiglie",
    totale: "Totale",
    invia: "Invia la richiesta",
    inviando: "Invio...",
    note: "Note per noi (facoltative)",
    carrello: "La tua richiesta",
    svuota: "Svuota",
    inviata: "Richiesta inviata. Ti avviseremo appena sarà confermata.",
    ordini: "I tuoi ordini",
    nessunOrdine: "Nessun ordine finora.",
    st: { richiesto: "In attesa di conferma", confermato: "Confermato", annullato: "Annullato" },
    sconto: "Sconto",
    notaNostra: "Nota",
    dettagli: "Dettagli",
    vitigni: "Vitigni",
    grad: "Gradazione",
    zona: "Zona",
    loginRichiesto: "Devi accedere.",
    soloOspiti: "Questa pagina è riservata agli ospiti.",
    vaiLogin: "Vai al login",
    caricamento: "Caricamento...",
    senzaAnnata: "senza annata",
  },
  en: {
    titolo: "Wines from the cellar",
    intro: "Choose the bottles you would like to buy. You send a request: after confirmation you will receive the total.",
    cerca: "Search a wine",
    nessuno: "There are no wines available at the moment.",
    disp: "available",
    bott: "bottles",
    totale: "Total",
    invia: "Send the request",
    inviando: "Sending...",
    note: "Notes for us (optional)",
    carrello: "Your request",
    svuota: "Clear",
    inviata: "Request sent. We will let you know as soon as it is confirmed.",
    ordini: "Your orders",
    nessunOrdine: "No orders yet.",
    st: { richiesto: "Waiting for confirmation", confermato: "Confirmed", annullato: "Cancelled" },
    sconto: "Discount",
    notaNostra: "Note",
    dettagli: "Details",
    vitigni: "Grapes",
    grad: "Alcohol",
    zona: "Area",
    loginRichiesto: "Please log in.",
    soloOspiti: "This page is for guests only.",
    vaiLogin: "Go to login",
    caricamento: "Loading...",
    senzaAnnata: "non-vintage",
  },
};

const stato = (v) => v.stato;

export default function ViniOspitePage() {
  const { lang } = useApp();
  const x = TX[lang === "en" ? "en" : "it"];
  const euro = (n) => Number(n || 0).toLocaleString(lang === "en" ? "en-GB" : "it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [accesso, setAccesso] = useState("caricamento");
  const [catalogo, setCatalogo] = useState([]);
  const [ordini, setOrdini] = useState([]);
  const [righe, setRighe] = useState([]);
  const [q, setQ] = useState("");
  const [qta, setQta] = useState({}); // vino_id -> quantita
  const [aperti, setAperti] = useState(() => new Set());
  const [note, setNote] = useState("");
  const [invio, setInvio] = useState(false);
  const [esito, setEsito] = useState(null);

  async function carica() {
    const { data: cat } = await supabase.rpc("cantina_catalogo");
    setCatalogo(cat || []);
    const { data: o } = await supabase.from("cantina_ordini").select("*").order("creato_il", { ascending: false });
    setOrdini(o || []);
    const { data: r } = await supabase.from("cantina_ordini_righe").select("*");
    setRighe(r || []);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setAccesso("login");
      const { data: pr } = await supabase.from("profili").select("*").eq("id", session.user.id).single();
      const p = applicaVista(pr);
      if (!p || p.ruolo !== "ospite") return setAccesso("ruolo");
      await carica();
      setAccesso("ok");
    }
    init();
  }, []);

  const filtrati = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return catalogo;
    return catalogo.filter((v) =>
      [v.produttore, v.nome, v.denominazione, v.tipologia, v.vitigni, v.annata, v.zona_produzione].join(" ").toLowerCase().includes(s)
    );
  }, [catalogo, q]);

  const gruppi = useMemo(() => {
    const m = new Map();
    filtrati.forEach((v) => {
      const k = v.tipologia || "—";
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(v);
    });
    return m;
  }, [filtrati]);

  if (accesso === "caricamento")
    return (
      <main>
        <p>{x.caricamento}</p>
      </main>
    );
  if (accesso !== "ok")
    return (
      <main>
        <div className="card">
          <p>{accesso === "login" ? x.loginRichiesto : x.soloOspiti}</p>
          <a href="/login" className="btn">
            {x.vaiLogin}
          </a>
        </div>
      </main>
    );

  const scelti = catalogo.filter((v) => (qta[v.id] || 0) > 0);
  const nBott = scelti.reduce((t, v) => t + qta[v.id], 0);
  const totale = scelti.reduce((t, v) => t + qta[v.id] * Number(v.prezzo), 0);
  const nomeV = (v) => [v.produttore, v.nome, v.annata || x.senzaAnnata].filter(Boolean).join(" · ") + (v.formato && v.formato !== "0,75 l" ? " (" + v.formato + ")" : "");

  async function invia() {
    setInvio(true);
    setEsito(null);
    const { error } = await supabase.rpc("cantina_crea_ordine", {
      p_righe: scelti.map((v) => ({ vino_id: v.id, quantita: qta[v.id] })),
      p_note: note,
    });
    setInvio(false);
    if (error) return setEsito({ errore: error.message });
    setQta({});
    setNote("");
    setEsito({ ok: true });
    await carica();
  }

  const apriChiudi = (k) =>
    setAperti((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <main>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .vi-carrello { position: sticky; bottom: 12px; z-index: 30; }
            @media (max-width: 720px) { .vi-carrello { bottom: calc(76px + env(safe-area-inset-bottom)); } }
          `,
        }}
      />
      <h1>{x.titolo}</h1>
      <p className="muted">{x.intro}</p>
      {esito && esito.ok && <p style={{ background: "#dff3e3", color: "#1f5c2e", padding: "0.6rem 0.8rem", borderRadius: 10 }}>{x.inviata}</p>}
      {esito && esito.errore && <p style={{ color: "#a32d2d" }}>{esito.errore}</p>}

      <label>
        {x.cerca}
        <input value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {catalogo.length === 0 && <p className="muted">{x.nessuno}</p>}

      {[...gruppi.entries()].map(([tip, vini]) => {
        const c = coloreTipologia(tip);
        const aperto = q.trim() ? true : aperti.has(tip);
        return (
          <div key={tip} className="card" style={{ marginBottom: "0.8rem", borderLeft: "6px solid " + c.bg }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => apriChiudi(tip)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && apriChiudi(tip)}
              style={{ cursor: "pointer", display: "flex", gap: "0.5rem", alignItems: "baseline" }}
            >
              <span style={{ width: "1rem" }}>{aperto ? "▾" : "▸"}</span>
              <h3 style={{ margin: 0 }}>{tip}</h3>
              <span className="muted" style={{ fontSize: "0.85em" }}>
                {vini.length}
              </span>
            </div>
            {aperto &&
              vini.map((v) => {
                const kd = "d" + v.id;
                return (
                  <div key={v.id} className="richiesta-item" style={{ padding: "0.5rem 0" }}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => apriChiudi(kd)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && apriChiudi(kd)}
                      style={{ cursor: "pointer" }}
                    >
                      <strong>{nomeV(v)}</strong>
                      <span className="muted" style={{ display: "block", fontSize: "0.85em" }}>
                        {[v.denominazione, v.zona_produzione].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    {aperti.has(kd) && (
                      <div style={{ background: "#faf8f1", borderRadius: 10, padding: "0.5rem 0.7rem", margin: "0.4rem 0" }}>
                        <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                          {v.vitigni ? `${x.vitigni}: ${v.vitigni}` : ""}
                          {v.vitigni && v.gradazione ? " · " : ""}
                          {v.gradazione ? `${x.grad}: ${v.gradazione}% vol` : ""}
                        </p>
                        <MaturitaIndicatore stato={stato(v)} lang={lang === "en" ? "en" : "it"} />
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.3rem" }}>
                      <strong>€ {euro(v.prezzo)}</strong>
                      <span className="muted" style={{ fontSize: "0.85em" }}>
                        {v.disponibili} {x.disp}
                      </span>
                      <SelettoreNumero
                        value={String(qta[v.id] || 0)}
                        onChange={(e) => setQta((p) => ({ ...p, [v.id]: parseInt(e.target.value || "0", 10) }))}
                        min={0}
                        max={v.disponibili}
                        required
                        style={{ width: "5rem", marginBottom: 0 }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        );
      })}

      {nBott > 0 && (
        <div className="card vi-carrello" style={{ background: "#fff6e0", boxShadow: "0 6px 20px rgba(0,0,0,0.25)" }}>
          <p style={{ margin: 0 }}>
            <strong>{x.carrello}:</strong> {nBott} {x.bott} — {x.totale} <strong>€ {euro(totale)}</strong>
          </p>
          {scelti.map((v) => (
            <p key={v.id} className="descrizione" style={{ margin: "0.1rem 0" }}>
              {qta[v.id]} × {nomeV(v)}
            </p>
          ))}
          <label>
            {x.note}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}></textarea>
          </label>
          <p style={{ margin: 0, display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn" disabled={invio} onClick={invia}>
              {invio ? x.inviando : x.invia}
            </button>
            <button type="button" className="btn btn-light" onClick={() => setQta({})}>
              {x.svuota}
            </button>
          </p>
        </div>
      )}

      <h2 style={{ marginTop: "1.5rem" }}>{x.ordini}</h2>
      <div className="card">
        {ordini.length === 0 && <p className="muted">{x.nessunOrdine}</p>}
        {ordini.map((o) => (
          <div key={o.id} className="richiesta-item">
            <strong>{fmtData(lang, String(o.creato_il).slice(0, 10), false)}</strong> — {x.st[o.stato]}
            {o.totale !== null && o.totale !== undefined ? ` — € ${euro(o.totale)}` : ""}
            {righe
              .filter((r) => r.ordine_id === o.id)
              .map((r) => (
                <p key={r.id} className="descrizione" style={{ margin: "0.1rem 0" }}>
                  {r.quantita} × {r.descrizione} — € {euro(r.prezzo_unitario)}
                </p>
              ))}
            {Number(o.sconto_totale) > 0 && (
              <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                {x.sconto}: − € {euro(o.sconto_totale)}
              </p>
            )}
            {o.note_admin && (
              <p className="descrizione" style={{ margin: "0.2rem 0" }}>
                {x.notaNostra}: {o.note_admin}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
