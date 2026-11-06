"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { codicePosizione, coloreTipologia, nomeVino, statoMaturita, etichettaAnnata } from "../../../lib/cantina";
import MaturitaIndicatore from "../../components/MaturitaIndicatore";
import MaturitaForm from "../../components/MaturitaForm";
import SelettoreNumero from "../../components/SelettoreNumero";

const num = (x) => (x === "" || x === null || x === undefined ? null : Number(String(x).replace(",", ".")));

export default function SchedaVinoPage() {
  const [stato, setStato] = useState("caricamento");
  const [v, setV] = useState(null);
  const [fratelli, setFratelli] = useState([]);
  const [bottiglie, setBottiglie] = useState([]);
  const [scaffali, setScaffali] = useState([]);
  const [acquisti, setAcquisti] = useState([]);
  const [modMat, setModMat] = useState(false);
  const [vend, setVend] = useState({ in_vendita: false, prezzo: "", n: "" });
  const [msg, setMsg] = useState(null);

  async function carica(id) {
    const { data: vino } = await supabase.from("cantina_vini").select("*").eq("id", id).single();
    if (!vino) return setStato("nontrovato");
    setV(vino);
    setVend({
      in_vendita: !!vino.in_vendita,
      prezzo: vino.prezzo_vendita === null || vino.prezzo_vendita === undefined ? "" : String(vino.prezzo_vendita),
      n: String(vino.bottiglie_in_vendita || 0),
    });
    const [b, s, a, f] = await Promise.all([
      supabase.from("cantina_bottiglie").select("*").eq("vino_id", id),
      supabase.from("cantina_scaffali").select("*"),
      supabase.from("cantina_acquisti").select("*").eq("vino_id", id).order("anno", { ascending: false }),
      supabase.from("cantina_vini").select("*").eq("nome", vino.nome).order("annata"),
    ]);
    setBottiglie(b.data || []);
    setScaffali(s.data || []);
    setAcquisti(a.data || []);
    setFratelli((f.data || []).filter((x) => (x.produttore || null) === (vino.produttore || null)));
    setStato("ok");
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setStato("login");
      const { data: p } = await supabase.from("profili").select("ruolo").eq("id", session.user.id).single();
      if (!p || p.ruolo !== "admin") return setStato("ruolo");
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) return setStato("nontrovato");
      await carica(id);
    }
    init();
  }, []);

  if (stato === "caricamento")
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  if (stato === "nontrovato")
    return (
      <main>
        <div className="card">
          <p>Vino non trovato.</p>
          <a href="/cantina/indice" className="btn">
            Vai all'indice
          </a>
        </div>
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

  const c = coloreTipologia(v.tipologia);
  const n = bottiglie.length;
  const sm = statoMaturita(v);
  const posizioni = bottiglie
    .map((b) => {
      if (b.scaffale_id) {
        const s = scaffali.find((x) => x.id === b.scaffale_id);
        return s ? codicePosizione(s, b.colonna, b.riga) : "?";
      }
      return b.zona;
    })
    .sort();
  const prov = new Map();
  bottiglie.forEach((b) => prov.set(b.provenienza || "Acquisto", (prov.get(b.provenienza || "Acquisto") || 0) + 1));

  async function salvaMaturita(campi) {
    const { error } = await supabase.from("cantina_vini").update(campi).eq("id", v.id);
    if (error) return "Errore: " + error.message;
    setModMat(false);
    await carica(v.id);
    return null;
  }

  async function salvaVendita(e) {
    e.preventDefault();
    setMsg(null);
    const prezzo = num(vend.prezzo);
    if (vend.in_vendita && !(prezzo > 0)) return setMsg("Indica il prezzo di vendita.");
    const { error } = await supabase
      .from("cantina_vini")
      .update({
        in_vendita: vend.in_vendita,
        prezzo_vendita: prezzo,
        bottiglie_in_vendita: vend.in_vendita ? Math.min(parseInt(vend.n || "0", 10), n) : 0,
      })
      .eq("id", v.id);
    if (error) return setMsg("Errore: " + error.message);
    await carica(v.id);
    setMsg("Salvato.");
  }

  return (
    <main>
      <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <a href="/cantina" className="btn btn-light">
          &larr; Mappa
        </a>
        <a href="/cantina/indice" className="btn btn-light">
          Indice
        </a>
        <a href={"/cantina/vini?id=" + v.id} className="btn btn-light">
          Modifica i dati
        </a>
      </p>

      <div className="card" style={{ borderLeft: "6px solid " + c.bg, marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>{v.nome}</h1>
        <p style={{ margin: "0.2rem 0" }}>
          <strong>{v.produttore || "Produttore non indicato"}</strong>
          {v.zona_produzione ? " · " + v.zona_produzione : ""}
        </p>
        <p className="descrizione" style={{ margin: "0.2rem 0" }}>
          {[v.tipologia, v.denominazione, v.zucchero, etichettaAnnata(v)].filter(Boolean).join(" · ")}
        </p>
        <p className="descrizione" style={{ margin: "0.2rem 0" }}>
          <strong>Gradazione:</strong> {v.gradazione ? v.gradazione + "% vol" : "da inserire"}
          {v.vitigni ? " · " : ""}
          {v.vitigni ? <><strong>Vitigni:</strong> {v.vitigni}</> : null}
        </p>
        {v.note && <p className="descrizione" style={{ margin: "0.3rem 0 0" }}><strong>Note:</strong> {v.note}</p>}
      </div>

      {fratelli.length > 1 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Altre annate e formati</h3>
          <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: 0 }}>
            {fratelli.map((f) => (
              <a key={f.id} href={"/cantina/vino?id=" + f.id} className={f.id === v.id ? "btn" : "btn btn-light"} style={{ padding: "0.3rem 0.8rem" }}>
                {etichettaAnnata(f)}
              </a>
            ))}
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Maturità</h3>
        <MaturitaIndicatore vino={v} stato={sm} />
        {!modMat ? (
          <button type="button" className="btn btn-light" onClick={() => setModMat(true)}>
            {sm ? "Modifica la maturità" : "Imposta la maturità"}
          </button>
        ) : (
          <MaturitaForm vino={v} onSalva={salvaMaturita} onAnnulla={() => setModMat(false)} />
        )}
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>In cantina: {n} {n === 1 ? "bottiglia" : "bottiglie"}</h3>
        {n > 0 && <p className="descrizione" style={{ margin: "0.2rem 0" }}>{posizioni.join(", ")}</p>}
        {prov.size > 0 && (
          <p className="descrizione" style={{ margin: "0.2rem 0" }}>
            <strong>Provenienza:</strong> {[...prov.entries()].map(([p, k]) => `${p} (${k})`).join(", ")}
          </p>
        )}
        {acquisti.length > 0 && (
          <p className="descrizione" style={{ margin: "0.2rem 0" }}>
            <strong>Acquisti:</strong>{" "}
            {acquisti.map((a) => `${a.anno}: ${a.quantita || 0} bott.${a.prezzo_pagato ? " a " + a.prezzo_pagato + " €" : ""}`).join(" · ")}
          </p>
        )}
        <p className="descrizione" style={{ margin: "0.2rem 0" }}>
          {v.prezzo_listino ? `Listino ${v.prezzo_listino} €` : ""}
          {v.prezzo_pagato ? `${v.prezzo_listino ? " · " : ""}pagato ${v.prezzo_pagato} €` : ""}
        </p>
      </div>

      <form className="card" onSubmit={salvaVendita} style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Vendita agli ospiti</h3>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400 }}>
          <input
            type="checkbox"
            style={{ width: "auto", margin: 0 }}
            checked={vend.in_vendita}
            onChange={(e) => setVend((p) => ({ ...p, in_vendita: e.target.checked }))}
          />
          In vendita
        </label>
        {vend.in_vendita && (
          <>
            <label>
              Prezzo di vendita (€ a bottiglia)
              <input
                inputMode="decimal"
                value={vend.prezzo}
                onChange={(e) => setVend((p) => ({ ...p, prezzo: e.target.value }))}
                placeholder="es. 35"
              />
            </label>
            <label>
              Bottiglie messe in vendita (massimo {n})
              <SelettoreNumero
                value={vend.n}
                onChange={(e) => setVend((p) => ({ ...p, n: e.target.value }))}
                min={0}
                max={Math.max(n, 0)}
                required
                vuoto="0"
              />
            </label>
          </>
        )}
        {msg && <p style={{ color: msg.startsWith("Errore") || msg.startsWith("Indica") ? "#a32d2d" : "#1f5c2e" }}>{msg}</p>}
        <button type="submit" className="btn">
          Salva
        </button>
      </form>
    </main>
  );
}
