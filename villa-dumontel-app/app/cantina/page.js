"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  LETTERE,
  ZONE,
  MOTIVI_SCARICO,
  codicePosizione,
  righeScaffale,
  capienza,
  coloreTipologia,
  nomeVino,
  sigla,
  cercaVini,
} from "../../lib/cantina";

function Modale({ titolo, onChiudi, children }) {
  return (
    <div
      onClick={onChiudi}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3vh 1rem", overflowY: "auto" }}
    >
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h2 style={{ margin: 0 }}>{titolo}</h2>
          <button type="button" className="btn btn-light" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Elenco di vini con ricerca, per scegliere quale piazzare
function ScegliVino({ vini, onScegli }) {
  const [q, setQ] = useState("");
  const elenco = cercaVini(vini, q).slice(0, 40);
  return (
    <div>
      <label>
        Cerca il vino
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="es. Barbaresco, Anselmet, 2020" autoFocus />
      </label>
      <div style={{ maxHeight: "45vh", overflowY: "auto" }}>
        {elenco.length === 0 && <p className="muted">Nessun vino trovato.</p>}
        {elenco.map((v) => (
          <div key={v.id} className="richiesta-item" style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ minWidth: 0 }}>
              <strong>{nomeVino(v)}</strong>
              <span className="muted" style={{ display: "block", fontSize: "0.8em" }}>
                {[v.tipologia, v.gradazione ? v.gradazione + "%" : null].filter(Boolean).join(" · ")}
              </span>
            </span>
            <button type="button" className="btn" onClick={() => onScegli(v)}>
              Scegli
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CantinaPage() {
  const [stato, setStato] = useState("caricamento");
  const [scaffali, setScaffali] = useState([]);
  const [vini, setVini] = useState([]);
  const [bottiglie, setBottiglie] = useState([]);
  const [ricerca, setRicerca] = useState("");
  const [vinoRiempi, setVinoRiempi] = useState(null); // modalita' inserimento rapido
  const [scegliPerRiempi, setScegliPerRiempi] = useState(false);
  const [sel, setSel] = useState(null); // { scaffale, col, riga, bottiglia? } oppure { zona }
  const [errore, setErrore] = useState(null);

  async function carica() {
    const [s, v, b] = await Promise.all([
      supabase.from("cantina_scaffali").select("*").order("ordine"),
      supabase.from("cantina_vini").select("*").eq("attivo", true).order("produttore").order("nome").limit(2000),
      supabase.from("cantina_bottiglie").select("*").limit(10000),
    ]);
    setScaffali(s.data || []);
    setVini(v.data || []);
    setBottiglie(b.data || []);
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

  const viniPerId = useMemo(() => new Map(vini.map((v) => [v.id, v])), [vini]);
  const occupate = useMemo(() => {
    const m = new Map();
    bottiglie.forEach((b) => {
      if (b.scaffale_id) m.set(b.scaffale_id + ":" + b.colonna + ":" + b.riga, b);
    });
    return m;
  }, [bottiglie]);
  const trovati = useMemo(() => {
    if (!ricerca.trim()) return null;
    return new Set(cercaVini(vini, ricerca).map((v) => v.id));
  }, [ricerca, vini]);

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

  const giacenza = (vinoId) => bottiglie.filter((b) => b.vino_id === vinoId).length;
  const posizioniDi = (vinoId) =>
    bottiglie
      .filter((b) => b.vino_id === vinoId)
      .map((b) => {
        if (b.scaffale_id) {
          const s = scaffali.find((x) => x.id === b.scaffale_id);
          return s ? codicePosizione(s, b.colonna, b.riga) : "?";
        }
        return b.zona;
      })
      .sort();

  async function piazza(vino, dove) {
    setErrore(null);
    const riga = dove.zona
      ? { vino_id: vino.id, zona: dove.zona }
      : { vino_id: vino.id, scaffale_id: dove.scaffale.id, colonna: dove.col, riga: dove.riga };
    const { data, error } = await supabase.from("cantina_bottiglie").insert(riga).select().single();
    if (error) return setErrore("Errore: " + error.message);
    setBottiglie((prev) => [...prev, data]);
  }

  async function rimuovi(b, motivo) {
    setErrore(null);
    const s = b.scaffale_id ? scaffali.find((x) => x.id === b.scaffale_id) : null;
    const { error } = await supabase.from("cantina_bottiglie").delete().eq("id", b.id);
    if (error) return setErrore("Errore: " + error.message);
    await supabase.from("cantina_movimenti").insert({
      vino_id: b.vino_id,
      tipo: "scarico",
      motivo,
      posizione: s ? codicePosizione(s, b.colonna, b.riga) : b.zona,
    });
    setBottiglie((prev) => prev.filter((x) => x.id !== b.id));
    setSel(null);
  }

  function clickCella(s, col, riga) {
    const b = occupate.get(s.id + ":" + col + ":" + riga);
    if (!b && vinoRiempi) return piazza(vinoRiempi, { scaffale: s, col, riga });
    setSel({ scaffale: s, col, riga, bottiglia: b || null });
  }

  const totBottiglie = bottiglie.length;
  const viniConGiacenza = new Set(bottiglie.map((b) => b.vino_id)).size;
  const attivi = scaffali.filter((s) => s.attivo);
  const libere = attivi.reduce((t, s) => t + capienza(s), 0) - bottiglie.filter((b) => b.scaffale_id && attivi.some((s) => s.id === b.scaffale_id)).length;

  return (
    <main>
      <h1>Cantina</h1>
      <p>
        <a href="/cantina/vini" className="btn btn-light">
          Elenco vini
        </a>
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0 }}>
          <strong>{totBottiglie}</strong> bottiglie · <strong>{viniConGiacenza}</strong> vini in cantina · <strong>{libere}</strong> posti liberi negli scaffali
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1rem" }}>
        <label style={{ minWidth: 220, flex: 1 }}>
          Dov'è? Cerca un vino
          <input value={ricerca} onChange={(e) => setRicerca(e.target.value)} placeholder="es. Barbaresco, Pavese, 2022" />
        </label>
        {!vinoRiempi && (
          <button type="button" className="btn" onClick={() => setScegliPerRiempi(true)}>
            Inserimento rapido
          </button>
        )}
      </div>

      {vinoRiempi && (
        <div className="card" style={{ marginBottom: "1rem", background: "#fff6d6" }}>
          <p style={{ margin: 0 }}>
            Inserimento rapido: tocca le celle vuote per piazzare <strong>{nomeVino(vinoRiempi)}</strong>.
          </p>
          <p style={{ margin: "0.5rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-light" onClick={() => setScegliPerRiempi(true)}>
              Cambia vino
            </button>
            <button type="button" className="btn" onClick={() => setVinoRiempi(null)}>
              Fine
            </button>
          </p>
        </div>
      )}

      {ricerca.trim() && trovati && (
        <p className="muted">
          {trovati.size} vini trovati; le celle evidenziate contengono le loro bottiglie ({bottiglie.filter((b) => trovati.has(b.vino_id)).length}).
        </p>
      )}
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      {scaffali.map((s) => {
        const righe = righeScaffale(s);
        const n = bottiglie.filter((b) => b.scaffale_id === s.id).length;
        return (
          <div key={s.id} className="card" style={{ marginBottom: "1rem", opacity: s.attivo ? 1 : 0.7 }}>
            <h3 style={{ margin: "0 0 0.15rem" }}>
              Scaffalatura {s.codice}{" "}
              <span className="muted" style={{ fontWeight: 400, fontSize: "0.85em" }}>
                {s.tipo} · {s.posizione || ""} {s.attivo ? "" : "(da montare)"}
              </span>
            </h3>
            <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.85em" }}>
              {n} bottiglie su {capienza(s)} posti
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 3 }}>
                <thead>
                  <tr>
                    <th></th>
                    {Array.from({ length: s.colonne }, (_, i) => (
                      <th key={i} style={{ fontSize: "0.75rem", color: "#6b6b60", fontWeight: 600 }}>
                        {LETTERE[i]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {righe.map((r) => (
                    <tr key={r}>
                      <td style={{ fontSize: "0.75rem", color: "#6b6b60", paddingRight: 4, textAlign: "right" }}>{r}</td>
                      {Array.from({ length: s.colonne }, (_, i) => {
                        const col = i + 1;
                        const b = occupate.get(s.id + ":" + col + ":" + r);
                        const v = b ? viniPerId.get(b.vino_id) : null;
                        const c = v ? coloreTipologia(v.tipologia) : null;
                        const evid = trovati && b && trovati.has(b.vino_id);
                        const spento = trovati && !evid;
                        return (
                          <td key={col}>
                            <button
                              type="button"
                              onClick={() => clickCella(s, col, r)}
                              title={(v ? nomeVino(v) + " — " : "") + codicePosizione(s, col, r)}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                border: evid ? "3px solid #1a5fb4" : "1px solid #c9c6b8",
                                background: c ? c.bg : "#f4f2ea",
                                color: c ? c.fg : "#999",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: 0,
                                opacity: spento ? 0.3 : 1,
                              }}
                            >
                              {v ? sigla(v) : ""}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <h2>Fuori scaffale</h2>
      <p className="muted">Cantinetta, magnum, cartoni: qui si contano le bottiglie senza una cella precisa.</p>
      {ZONE.map((z) => {
        const dentro = bottiglie.filter((b) => b.zona === z && !b.scaffale_id);
        const gruppi = new Map();
        dentro.forEach((b) => gruppi.set(b.vino_id, [...(gruppi.get(b.vino_id) || []), b]));
        return (
          <div key={z} className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.4rem" }}>
              {z} <span className="muted" style={{ fontWeight: 400 }}>({dentro.length})</span>
            </h3>
            {[...gruppi.entries()].map(([vid, righe]) => {
              const v = viniPerId.get(vid);
              return (
                <p key={vid} className="descrizione" style={{ margin: "0.2rem 0", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ flex: 1, minWidth: 180 }}>
                    {v ? nomeVino(v) : "?"} — <strong>{righe.length}</strong>
                  </span>
                  <button type="button" className="btn btn-light" style={{ padding: "0.15rem 0.7rem" }} onClick={() => piazza(v, { zona: z })}>
                    +
                  </button>
                  <button type="button" className="btn btn-light" style={{ padding: "0.15rem 0.7rem" }} onClick={() => setSel({ zona: z, bottiglia: righe[0] })}>
                    −
                  </button>
                </p>
              );
            })}
            <button type="button" className="btn btn-light" onClick={() => setSel({ zona: z, aggiungi: true })}>
              Aggiungi un vino qui
            </button>
          </div>
        );
      })}

      {scegliPerRiempi && (
        <Modale titolo="Quale vino stai piazzando?" onChiudi={() => setScegliPerRiempi(false)}>
          <ScegliVino
            vini={vini}
            onScegli={(v) => {
              setVinoRiempi(v);
              setScegliPerRiempi(false);
            }}
          />
        </Modale>
      )}

      {sel && sel.bottiglia && (
        <Modale titolo={sel.scaffale ? "Posizione " + codicePosizione(sel.scaffale, sel.col, sel.riga) : sel.zona} onChiudi={() => setSel(null)}>
          {(() => {
            const v = viniPerId.get(sel.bottiglia.vino_id);
            return (
              <>
                <p style={{ margin: "0.6rem 0 0.2rem" }}>
                  <strong>{nomeVino(v)}</strong>
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  {[v?.tipologia, v?.vitigni, v?.gradazione ? v.gradazione + "% vol" : null].filter(Boolean).join(" · ")}
                </p>
                <p className="muted" style={{ margin: "0.3rem 0" }}>
                  In cantina: {giacenza(sel.bottiglia.vino_id)} bottiglie — {posizioniDi(sel.bottiglia.vino_id).join(", ")}
                </p>
                <label>
                  Togli la bottiglia perché è stata
                  <select id="motivo" defaultValue="bevuta">
                    {MOTIVI_SCARICO.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button type="button" className="btn" onClick={() => rimuovi(sel.bottiglia, document.getElementById("motivo").value)}>
                    Togli la bottiglia
                  </button>
                  <a href={"/cantina/vini?id=" + sel.bottiglia.vino_id} className="btn btn-light">
                    Modifica il vino
                  </a>
                </p>
              </>
            );
          })()}
        </Modale>
      )}

      {sel && !sel.bottiglia && (sel.scaffale || sel.aggiungi) && (
        <Modale
          titolo={sel.scaffale ? "Aggiungi in " + codicePosizione(sel.scaffale, sel.col, sel.riga) : "Aggiungi in " + sel.zona}
          onChiudi={() => setSel(null)}
        >
          <ScegliVino
            vini={vini}
            onScegli={async (v) => {
              if (sel.scaffale) {
                await piazza(v, { scaffale: sel.scaffale, col: sel.col, riga: sel.riga });
              } else {
                const n = parseInt(window.prompt("Quante bottiglie?", "1") || "0", 10);
                for (let i = 0; i < n; i++) await piazza(v, { zona: sel.zona });
              }
              setSel(null);
            }}
          />
        </Modale>
      )}
    </main>
  );
}
