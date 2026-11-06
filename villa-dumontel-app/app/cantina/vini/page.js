"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { TIPOLOGIE, cercaVini, coloreTipologia, nomeVino, codicePosizione } from "../../../lib/cantina";

const VUOTO = {
  produttore: "",
  nome: "",
  denominazione: "",
  zona_produzione: "",
  tipologia: "Rosso",
  zucchero: "",
  vitigni: "",
  formato: "0,75 l",
  gradazione: "",
  annata: "",
  prezzo_listino: "",
  prezzo_pagato: "",
  prezzo_vendita: "",
  per_ospiti: false,
  note: "",
};

const num = (x) => (x === "" || x === null || x === undefined ? null : Number(String(x).replace(",", ".")));

export default function ViniCantinaPage() {
  const [stato, setStato] = useState("caricamento");
  const [vini, setVini] = useState([]);
  const [bottiglie, setBottiglie] = useState([]);
  const [scaffali, setScaffali] = useState([]);
  const [acquisti, setAcquisti] = useState([]);
  const [q, setQ] = useState("");
  const [tip, setTip] = useState("tutte");
  const [soloGiacenza, setSoloGiacenza] = useState(false);
  const [mod, setMod] = useState(null); // { id?, ...campi }
  const [errore, setErrore] = useState(null);
  const [aperto, setAperto] = useState(null); // scheda vino aperta

  async function carica() {
    const [v, b, s, a] = await Promise.all([
      supabase.from("cantina_vini").select("*").order("produttore").order("nome").limit(3000),
      supabase.from("cantina_bottiglie").select("vino_id, scaffale_id, colonna, riga, zona, provenienza").limit(10000),
      supabase.from("cantina_scaffali").select("*"),
      supabase.from("cantina_acquisti").select("*").order("anno", { ascending: false }).limit(5000),
    ]);
    setVini(v.data || []);
    setBottiglie(b.data || []);
    setScaffali(s.data || []);
    setAcquisti(a.data || []);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setStato("login");
      const { data: p } = await supabase.from("profili").select("ruolo").eq("id", session.user.id).single();
      if (!p || p.ruolo !== "admin") return setStato("ruolo");
      await carica();
      const id = new URLSearchParams(window.location.search).get("id");
      if (id) {
        const { data } = await supabase.from("cantina_vini").select("*").eq("id", id).single();
        if (data) setMod(daRiga(data));
      }
      setStato("ok");
    }
    init();
  }, []);

  const giac = useMemo(() => {
    const m = new Map();
    bottiglie.forEach((b) => m.set(b.vino_id, (m.get(b.vino_id) || 0) + 1));
    return m;
  }, [bottiglie]);

  // riepilogo: bottiglie per tipologia, con le annate
  const riepilogo = useMemo(() => {
    const perVino = new Map(vini.map((v) => [v.id, v]));
    const m = new Map();
    bottiglie.forEach((b) => {
      const v = perVino.get(b.vino_id);
      if (!v) return;
      const tp = v.tipologia || "Altro";
      const e = m.get(tp) || { tot: 0, annate: new Map() };
      e.tot += 1;
      const a = v.annata ? String(v.annata) : "s.a.";
      e.annate.set(a, (e.annate.get(a) || 0) + 1);
      m.set(tp, e);
    });
    return [...m.entries()].sort((x, y) => y[1].tot - x[1].tot);
  }, [vini, bottiglie]);

  const filtrati = useMemo(
    () =>
      cercaVini(vini, q).filter(
        (v) => (tip === "tutte" || v.tipologia === tip) && (!soloGiacenza || (giac.get(v.id) || 0) > 0)
      ),
    [vini, q, tip, soloGiacenza, giac]
  );

  function daRiga(v) {
    const o = { id: v.id };
    Object.keys(VUOTO).forEach((k) => (o[k] = v[k] === null || v[k] === undefined ? (typeof VUOTO[k] === "boolean" ? false : "") : v[k]));
    return o;
  }

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    if (!mod.nome.trim()) return setErrore("Scrivi il nome del vino.");
    const riga = {
      produttore: mod.produttore.trim() || null,
      nome: mod.nome.trim(),
      denominazione: mod.denominazione.trim() || null,
      zona_produzione: mod.zona_produzione.trim() || null,
      tipologia: mod.tipologia || null,
      zucchero: mod.zucchero.trim() || null,
      vitigni: mod.vitigni.trim() || null,
      formato: mod.formato.trim() || null,
      gradazione: num(mod.gradazione),
      annata: num(mod.annata),
      prezzo_listino: num(mod.prezzo_listino),
      prezzo_pagato: num(mod.prezzo_pagato),
      prezzo_vendita: num(mod.prezzo_vendita),
      per_ospiti: !!mod.per_ospiti,
      note: mod.note.trim() || null,
    };
    const { error } = mod.id
      ? await supabase.from("cantina_vini").update(riga).eq("id", mod.id)
      : await supabase.from("cantina_vini").insert(riga);
    if (error) return setErrore("Errore: " + error.message);
    setMod(null);
    await carica();
  }

  async function elimina(v) {
    const n = giac.get(v.id) || 0;
    if (n > 0) return alert(`"${v.nome}" ha ancora ${n} bottiglie in cantina: toglile prima dalla mappa.`);
    if (!window.confirm(`Eliminare "${nomeVino(v)}" dall'elenco?`)) return;
    const { error } = await supabase.from("cantina_vini").delete().eq("id", v.id);
    if (error) return alert("Errore: " + error.message);
    await carica();
  }

  if (stato === "caricamento")
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  if (stato !== "ok")
    return (
      <main>
        <div className="card">
          <p>{stato === "login" ? "Devi accedere." : "Pagina riservata all'amministratore."}</p>
          <a href="/login" className="btn">
            Vai al login
          </a>
        </div>
      </main>
    );

  const set = (k, v) => setMod((p) => ({ ...p, [k]: v }));
  const campo = (k, label, extra = {}) => (
    <label>
      {label}
      <input value={mod[k]} onChange={(e) => set(k, e.target.value)} {...extra} />
    </label>
  );
  const posizioni = (id) =>
    bottiglie
      .filter((b) => b.vino_id === id)
      .map((b) => {
        if (b.scaffale_id) {
          const s = scaffali.find((x) => x.id === b.scaffale_id);
          return s ? codicePosizione(s, b.colonna, b.riga) : "?";
        }
        return b.zona;
      })
      .sort();

  return (
    <main>
      <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <a href="/cantina" className="btn btn-light">
          &larr; Mappa
        </a>
        <a href="/cantina/scaffali" className="btn btn-light">
          Scaffalature
        </a>
      </p>
      <h1>Vini</h1>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1rem" }}>
        <label style={{ minWidth: 200, flex: 1 }}>
          Cerca
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label>
          Tipologia
          <select value={tip} onChange={(e) => setTip(e.target.value)}>
            <option value="tutte">Tutte</option>
            {TIPOLOGIE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontWeight: 400 }}>
          <input type="checkbox" style={{ width: "auto", margin: 0 }} checked={soloGiacenza} onChange={(e) => setSoloGiacenza(e.target.checked)} />
          Solo in cantina
        </label>
        <button type="button" className="btn" onClick={() => setMod({ ...VUOTO })}>
          Nuovo vino
        </button>
      </div>
      <p className="muted">
        {filtrati.length} vini · {bottiglie.length} bottiglie in cantina
      </p>

      {riepilogo.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Bottiglie per tipologia</h3>
          {riepilogo.map(([tp, e]) => {
            const c = coloreTipologia(tp);
            const annate = [...e.annate.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
            return (
              <p key={tp} className="descrizione" style={{ margin: "0.25rem 0", borderLeft: "5px solid " + c.bg, paddingLeft: "0.6rem" }}>
                <strong>{tp}: {e.tot}</strong>
                <span className="muted"> — {annate.map(([a, k]) => `${a} (${k})`).join(", ")}</span>
              </p>
            );
          })}
        </div>
      )}

      <div className="card">
        {filtrati.map((v) => {
          const c = coloreTipologia(v.tipologia);
          const n = giac.get(v.id) || 0;
          const isAperto = aperto === v.id;
          const prov = new Map();
          bottiglie.filter((b) => b.vino_id === v.id).forEach((b) => prov.set(b.provenienza || "Acquisto", (prov.get(b.provenienza || "Acquisto") || 0) + 1));
          const acq = acquisti.filter((a) => a.vino_id === v.id);
          return (
            <div key={v.id} className="richiesta-item" style={{ borderLeft: "5px solid " + c.bg, paddingLeft: "0.6rem" }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setAperto(isAperto ? null : v.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAperto(isAperto ? null : v.id)}
                style={{ cursor: "pointer" }}
              >
                <span style={{ marginRight: "0.4rem" }}>{isAperto ? "▾" : "▸"}</span>
                <a href={"/cantina/vino?id=" + v.id}>
                <strong>{nomeVino(v)}</strong>
              </a>
                <span
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.05rem 0.5rem",
                    borderRadius: 999,
                    fontSize: "0.8em",
                    background: n === 0 ? "#eee" : n === 1 ? "#fde2e2" : "#e3f1e6",
                    color: n === 0 ? "#777" : n === 1 ? "#8a1f1f" : "#1f5c2e",
                  }}
                >
                  {n === 0 ? "esaurito" : n === 1 ? "ultima bottiglia" : n + " bottiglie"}
                </span>
              </div>
              {isAperto && (
                <div style={{ margin: "0.5rem 0 0.2rem", background: "#faf8f1", borderRadius: 10, padding: "0.6rem 0.8rem" }}>
                  <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                    {[v.tipologia, v.denominazione, v.zucchero, v.formato].filter(Boolean).join(" · ")}
                  </p>
                  <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                    <strong>Annata:</strong> {v.annata || "non indicata"} · <strong>Gradazione:</strong> {v.gradazione ? v.gradazione + "% vol" : "da inserire"}
                    {v.vitigni ? ` · Vitigni: ${v.vitigni}` : ""}
                  </p>
                  <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                    <strong>In cantina:</strong> {n}{n ? " — " + posizioni(v.id).join(", ") : ""}
                  </p>
                  {prov.size > 0 && (
                    <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                      <strong>Provenienza:</strong> {[...prov.entries()].map(([p, k]) => `${p} (${k})`).join(", ")}
                    </p>
                  )}
                  {acq.length > 0 && (
                    <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                      <strong>Acquisti:</strong>{" "}
                      {acq.map((a) => `${a.anno}: ${a.quantita || 0} bott.${a.prezzo_pagato ? " a " + a.prezzo_pagato + " €" : ""}`).join(" · ")}
                    </p>
                  )}
                  <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                    {v.prezzo_listino ? `Listino ${v.prezzo_listino} €` : ""}
                    {v.prezzo_pagato ? `${v.prezzo_listino ? " · " : ""}pagato ${v.prezzo_pagato} €` : ""}
                    {v.prezzo_vendita ? ` · vendita ${v.prezzo_vendita} €` : ""}
                    {v.per_ospiti ? " · per gli ospiti" : ""}
                  </p>
                  {v.note && (
                    <p className="descrizione" style={{ margin: "0.3rem 0 0.1rem" }}>
                      <strong>Note:</strong> {v.note}
                    </p>
                  )}
                  <p style={{ margin: "0.5rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-light" onClick={() => setMod(daRiga(v))}>
                      Modifica
                    </button>
                    <button type="button" className="btn btn-light" onClick={() => elimina(v)}>
                      Elimina
                    </button>
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {filtrati.length === 0 && <p className="muted">Nessun vino.</p>}
      </div>

      {mod && (
        <div
          onClick={() => setMod(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", justifyContent: "center", padding: "3vh 1rem", overflowY: "auto" }}
        >
          <form onSubmit={salva} onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 560, background: "#fff", alignSelf: "flex-start" }}>
            <h2 style={{ marginTop: 0 }}>{mod.id ? "Modifica vino" : "Nuovo vino"}</h2>
            {campo("produttore", "Produttore")}
            {campo("nome", "Nome del vino", { required: true })}
            {campo("denominazione", "Denominazione")}
            {campo("zona_produzione", "Zona di produzione (es. Piemonte, Champagne, Valle d'Aosta)")}
            <label>
              Tipologia
              <select value={mod.tipologia} onChange={(e) => set("tipologia", e.target.value)}>
                {TIPOLOGIE.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {campo("zucchero", "Zucchero (secco, dolce...)")}
            {campo("vitigni", "Vitigni")}
            {campo("formato", "Formato (es. 0,75 l, 1,5 l)")}
            {campo("gradazione", "Gradazione % vol", { inputMode: "decimal", placeholder: "es. 13,5" })}
            {campo("annata", "Annata", { inputMode: "numeric", placeholder: "es. 2020" })}
            {campo("prezzo_listino", "Prezzo di listino (€)", { inputMode: "decimal" })}
            {campo("prezzo_pagato", "Prezzo pagato (€)", { inputMode: "decimal" })}
            {campo("prezzo_vendita", "Prezzo di vendita agli ospiti (€)", { inputMode: "decimal" })}
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400 }}>
              <input type="checkbox" style={{ width: "auto", margin: 0 }} checked={mod.per_ospiti} onChange={(e) => set("per_ospiti", e.target.checked)} />
              Disponibile per gli ospiti (in futuro)
            </label>
            <label>
              Note
              <textarea value={mod.note} onChange={(e) => set("note", e.target.value)} rows={3}></textarea>
            </label>
            {mod.id && acquisti.filter((a) => a.vino_id === mod.id).length > 0 && (
              <div className="muted" style={{ fontSize: "0.85em", margin: "0.5rem 0" }}>
                <strong>Acquisti:</strong>{" "}
                {acquisti
                  .filter((a) => a.vino_id === mod.id)
                  .map((a) => `${a.anno}: ${a.quantita || 0} bott.${a.prezzo_pagato ? " a " + a.prezzo_pagato + " €" : ""}`)
                  .join(" · ")}
              </div>
            )}
            {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
            <button type="submit" className="btn">
              Salva
            </button>{" "}
            <button type="button" className="btn btn-light" onClick={() => setMod(null)}>
              Annulla
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
