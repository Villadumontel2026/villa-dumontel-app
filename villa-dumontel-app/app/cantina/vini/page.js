"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Matita, Cestino } from "../../components/IconeAzione";
import { TIPOLOGIE, cercaVini, coloreTipologia, nomeVino, codicePosizione } from "../../../lib/cantina";

const VUOTO = {
  produttore: "",
  nome: "",
  denominazione: "",
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

  async function carica() {
    const [v, b, s, a] = await Promise.all([
      supabase.from("cantina_vini").select("*").order("produttore").order("nome").limit(3000),
      supabase.from("cantina_bottiglie").select("vino_id, scaffale_id, colonna, riga, zona").limit(10000),
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

      <div className="card">
        {filtrati.map((v) => {
          const c = coloreTipologia(v.tipologia);
          const n = giac.get(v.id) || 0;
          return (
            <div key={v.id} className="richiesta-item" style={{ borderLeft: "5px solid " + c.bg, paddingLeft: "0.6rem" }}>
              <strong>{nomeVino(v)}</strong>
              <span style={{ marginLeft: "0.4rem", whiteSpace: "nowrap" }}>
                <Matita onClick={() => setMod(daRiga(v))} />
                <Cestino onClick={() => elimina(v)} />
              </span>
              <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                {[v.tipologia, v.vitigni, v.gradazione ? v.gradazione + "% vol" : "gradazione da inserire", v.denominazione]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="descrizione" style={{ margin: "0.1rem 0" }}>
                <strong>{n}</strong> in cantina{n ? ": " + posizioni(v.id).join(", ") : ""}
                {v.prezzo_pagato ? ` · pagato ${v.prezzo_pagato} €` : ""}
                {v.per_ospiti ? " · per gli ospiti" : ""}
              </p>
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
