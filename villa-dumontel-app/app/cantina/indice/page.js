"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { cercaVini, coloreTipologia, etichettaAnnata, indiceVini, statoMaturita } from "../../../lib/cantina";
import MaturitaIndicatore from "../../components/MaturitaIndicatore";
import SelettoreNumero from "../../components/SelettoreNumero";

const num = (x) => (x === "" || x === null || x === undefined ? null : Number(String(x).replace(",", ".")));

export default function IndiceCantinaPage() {
  const [stato, setStato] = useState("caricamento");
  const [vini, setVini] = useState([]);
  const [conta, setConta] = useState(new Map());
  const [q, setQ] = useState("");
  const [aperti, setAperti] = useState(() => new Set());
  const [errore, setErrore] = useState(null);

  async function carica() {
    const [v, b] = await Promise.all([
      supabase.from("cantina_vini").select("*").eq("attivo", true).order("produttore").order("nome").order("annata").limit(3000),
      supabase.from("cantina_bottiglie").select("vino_id").limit(10000),
    ]);
    setVini(v.data || []);
    const m = new Map();
    (b.data || []).forEach((x) => m.set(x.vino_id, (m.get(x.vino_id) || 0) + 1));
    setConta(m);
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
      setStato("ok");
    }
    init();
  }, []);

  const cercando = q.trim().length > 0;
  const filtrati = useMemo(() => cercaVini(vini, q), [vini, q]);
  const indice = useMemo(() => indiceVini(filtrati), [filtrati]);

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

  const aprChi = (k) =>
    setAperti((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const isAperto = (k) => cercando || aperti.has(k);
  const tot = (righe) => righe.reduce((t, r) => t + (conta.get(r.id) || 0), 0);

  async function aggiorna(v, campi) {
    setErrore(null);
    const { error } = await supabase.from("cantina_vini").update(campi).eq("id", v.id);
    if (error) return setErrore("Errore: " + error.message);
    setVini((prev) => prev.map((x) => (x.id === v.id ? { ...x, ...campi } : x)));
  }

  async function escludiVino(righe) {
    if (!window.confirm("Escludere questo vino dalla vendita (tutte le annate)?")) return;
    for (const r of righe) await aggiorna(r, { in_vendita: false, bottiglie_in_vendita: 0 });
  }

  const testata = ({ chiave, titolo, sotto, livello }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => aprChi(chiave)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && aprChi(chiave)}
      style={{ cursor: "pointer", display: "flex", gap: "0.5rem", alignItems: "baseline", padding: livello === 0 ? "0.1rem 0" : "0.25rem 0" }}
    >
      <span style={{ width: "1rem" }}>{isAperto(chiave) ? "▾" : "▸"}</span>
      {livello === 0 ? <h3 style={{ margin: 0 }}>{titolo}</h3> : <strong>{titolo}</strong>}
      <span className="muted" style={{ fontSize: "0.85em" }}>
        {sotto}
      </span>
    </div>
  );

  return (
    <main>
      <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <a href="/cantina" className="btn btn-light">
          &larr; Mappa
        </a>
        <a href="/cantina/vini" className="btn btn-light">
          Elenco vini
        </a>
        <a href="/cantina/ordini" className="btn btn-light">
          Ordini
        </a>
      </p>
      <h1>Indice della cantina</h1>
      <label>
        Cerca
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="vino, produttore, annata..." />
      </label>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      {[...indice.entries()].map(([zona, produttori]) => {
        const kz = "z:" + zona;
        const righeZona = [...produttori.values()].flatMap((m) => [...m.values()].flat());
        return (
          <div key={zona} className="card" style={{ marginBottom: "0.8rem" }}>
            {testata({ chiave: kz, titolo: zona, sotto: `${tot(righeZona)} bottiglie`, livello: 0 })}
            {isAperto(kz) &&
              [...produttori.entries()].map(([prod, vins]) => {
                const kp = "p:" + zona + "|" + prod;
                const righeProd = [...vins.values()].flat();
                return (
                  <div key={prod} style={{ marginLeft: "1rem", borderLeft: "2px solid #e5e2d6", paddingLeft: "0.7rem" }}>
                    {testata({ chiave: kp, titolo: prod, sotto: `${vins.size} vini · ${tot(righeProd)} bottiglie`, livello: 1 })}
                    {isAperto(kp) &&
                      [...vins.entries()].map(([nome, righe]) => {
                        const kv = "v:" + zona + "|" + prod + "|" + nome;
                        const c = coloreTipologia(righe[0].tipologia);
                        const inVendita = righe.some((r) => r.in_vendita && r.bottiglie_in_vendita > 0);
                        return (
                          <div key={nome} style={{ marginLeft: "0.8rem", borderLeft: "5px solid " + c.bg, paddingLeft: "0.6rem", margin: "0.3rem 0 0.3rem 0.8rem" }}>
                            {testata({ chiave: kv, titolo: nome, sotto: `${righe[0].tipologia || ""} · ${tot(righe)} bott.${inVendita ? " · in vendita" : ""}`, livello: 2 })}
                            {isAperto(kv) && (
                              <div style={{ marginLeft: "1rem" }}>
                                <p className="descrizione" style={{ margin: "0.1rem 0 0.4rem" }}>
                                  {[righe[0].denominazione, righe[0].vitigni, righe[0].gradazione ? righe[0].gradazione + "% vol" : null]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                                {righe.map((r) => {
                                  const n = conta.get(r.id) || 0;
                                  const sm = statoMaturita(r);
                                  return (
                                    <div key={r.id} className="richiesta-item" style={{ padding: "0.35rem 0" }}>
                                      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                                        <a href={"/cantina/vino?id=" + r.id} style={{ fontWeight: 600 }}>
                                          {etichettaAnnata(r)}
                                        </a>
                                        <span>
                                          <strong>{n}</strong> {n === 1 ? "bottiglia" : "bottiglie"}
                                        </span>
                                        <span style={{ minWidth: 120, flex: "0 1 150px" }}>
                                          <MaturitaIndicatore vino={r} stato={sm} compatto />
                                        </span>
                                      </div>
                                      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.25rem" }}>
                                        <label style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center" }}>
                                          in vendita
                                          <SelettoreNumero
                                            value={String(Math.min(r.bottiglie_in_vendita || 0, n))}
                                            onChange={(e) => {
                                              const k = parseInt(e.target.value || "0", 10);
                                              aggiorna(r, { bottiglie_in_vendita: k, in_vendita: k > 0 });
                                            }}
                                            min={0}
                                            max={n}
                                            required
                                            style={{ width: "4.5rem", marginBottom: 0 }}
                                          />
                                        </label>
                                        <label style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center" }}>
                                          €
                                          <input
                                            key={r.id + ":" + (r.prezzo_vendita ?? "")}
                                            inputMode="decimal"
                                            defaultValue={r.prezzo_vendita ?? ""}
                                            placeholder="prezzo"
                                            style={{ width: "5.5rem", marginBottom: 0 }}
                                            onBlur={(e) => {
                                              const p = num(e.target.value);
                                              if (p !== (r.prezzo_vendita === undefined ? null : r.prezzo_vendita)) aggiorna(r, { prezzo_vendita: p });
                                            }}
                                          />
                                        </label>
                                        {r.in_vendita && r.bottiglie_in_vendita > 0 && !(r.prezzo_vendita > 0) && (
                                          <span style={{ color: "#a32d2d", fontSize: "0.85em" }}>manca il prezzo: gli ospiti non lo vedono</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {inVendita && (
                                  <button type="button" className="btn btn-light" style={{ padding: "0.25rem 0.8rem" }} onClick={() => escludiVino(righe)}>
                                    Escludi questo vino dalla vendita
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
          </div>
        );
      })}
      {indice.size === 0 && <p className="muted">Nessun vino.</p>}
    </main>
  );
}
