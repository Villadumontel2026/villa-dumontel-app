"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import SelettoreNumero from "../../components/SelettoreNumero";

const num = (x) => (x === "" || x === null || x === undefined ? 0 : Number(String(x).replace(",", ".")) || 0);
const euro = (n) => Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (s) => {
  const d = new Date(s);
  return d.toLocaleDateString("it-IT") + " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
};

export default function OrdiniViniPage() {
  const [stato, setStato] = useState("caricamento");
  const [ordini, setOrdini] = useState([]);
  const [righe, setRighe] = useState([]);
  const [fam, setFam] = useState([]);
  const [mod, setMod] = useState({}); // ordine_id -> { righe: {id: {q, p}}, sconto, tipoSconto, nota }
  const [aperti, setAperti] = useState(() => new Set());
  const [msg, setMsg] = useState(null);

  async function carica() {
    const [o, r, f] = await Promise.all([
      supabase.from("cantina_ordini").select("*").order("creato_il", { ascending: false }).limit(300),
      supabase.from("cantina_ordini_righe").select("*").limit(3000),
      supabase.from("famiglie").select("id, nome"),
    ]);
    setOrdini(o.data || []);
    setRighe(r.data || []);
    setFam(f.data || []);
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

  const nomeFam = (id) => (fam.find((f) => f.id === id) || {}).nome || "?";

  function stato0(o) {
    if (mod[o.id]) return mod[o.id];
    const rr = {};
    righe.filter((r) => r.ordine_id === o.id).forEach((r) => (rr[r.id] = { q: String(r.quantita), p: String(r.prezzo_unitario) }));
    return { righe: rr, sconto: String(o.sconto_totale || ""), tipoSconto: "eur", nota: o.note_admin || "" };
  }
  const set = (o, patch) => setMod((prev) => ({ ...prev, [o.id]: { ...stato0(o), ...patch } }));
  const setRiga = (o, rid, patch) => {
    const s = stato0(o);
    set(o, { righe: { ...s.righe, [rid]: { ...s.righe[rid], ...patch } } });
  };

  function calcola(o) {
    const s = stato0(o);
    const rs = righe.filter((r) => r.ordine_id === o.id);
    const lordo = rs.reduce((t, r) => t + num(s.righe[r.id]?.q) * num(s.righe[r.id]?.p), 0);
    const scontoEur = s.tipoSconto === "pct" ? (lordo * num(s.sconto)) / 100 : num(s.sconto);
    const sc = Math.min(Math.max(scontoEur, 0), lordo);
    return { lordo, sconto: sc, totale: lordo - sc, rs, s };
  }

  async function conferma(o) {
    const { sconto, rs, s } = calcola(o);
    setMsg(null);
    const { error } = await supabase.rpc("cantina_conferma_ordine", {
      p_id: o.id,
      p_righe: rs.map((r) => ({ id: r.id, quantita: Math.round(num(s.righe[r.id]?.q)), prezzo_unitario: num(s.righe[r.id]?.p) })),
      p_sconto: sconto,
      p_note: s.nota,
    });
    if (error) return setMsg("Errore: " + error.message);
    setMod((p) => {
      const n = { ...p };
      delete n[o.id];
      return n;
    });
    await carica();
    setMsg("Ordine confermato: l'ospite è stato avvisato e la spesa è nella sua famiglia. Ricorda di togliere le bottiglie dalla mappa (motivo: venduta).");
  }

  async function annulla(o) {
    if (!window.confirm("Annullare questa richiesta? L'ospite verrà avvisato.")) return;
    const s = stato0(o);
    setMsg(null);
    const { error } = await supabase.rpc("cantina_annulla_ordine", { p_id: o.id, p_note: s.nota });
    if (error) return setMsg("Errore: " + error.message);
    await carica();
  }

  const apriChiudi = (id) =>
    setAperti((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const daConfermare = ordini.filter((o) => o.stato === "richiesto");
  const altri = ordini.filter((o) => o.stato !== "richiesto");
  const badge = { richiesto: "#fff6e0", confermato: "#dff3e3", annullato: "#eee" };

  function scheda(o) {
    const { lordo, sconto, totale, rs, s } = calcola(o);
    const modificabile = o.stato === "richiesto";
    const isAperto = aperti.has(o.id) || modificabile;
    return (
      <div key={o.id} className="card" style={{ marginBottom: "0.8rem", background: badge[o.stato] }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => !modificabile && apriChiudi(o.id)}
          style={{ cursor: modificabile ? "default" : "pointer" }}
        >
          <strong>
            #{o.id} · {nomeFam(o.famiglia_id)}
          </strong>{" "}
          <span className="muted" style={{ fontSize: "0.85em" }}>
            {dmy(o.creato_il)} · {o.stato}
            {o.totale !== null && o.totale !== undefined && o.stato !== "richiesto" ? ` · € ${euro(o.totale)}` : ""}
          </span>
        </div>
        {isAperto && (
          <div style={{ marginTop: "0.5rem" }}>
            {o.note_ospite && <p className="descrizione">Nota dell'ospite: {o.note_ospite}</p>}
            {rs.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", padding: "0.3rem 0", borderTop: "1px solid #e5e2d6" }}>
                <span style={{ flex: "1 1 200px", minWidth: 0 }}>{r.descrizione}</span>
                {modificabile ? (
                  <>
                    <SelettoreNumero
                      value={s.righe[r.id]?.q ?? "0"}
                      onChange={(e) => setRiga(o, r.id, { q: e.target.value })}
                      min={0}
                      max={Math.max(30, r.quantita)}
                      required
                      style={{ width: "4.5rem", marginBottom: 0 }}
                    />
                    <label style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center" }}>
                      €
                      <input
                        inputMode="decimal"
                        value={s.righe[r.id]?.p ?? ""}
                        onChange={(e) => setRiga(o, r.id, { p: e.target.value })}
                        style={{ width: "5.5rem", marginBottom: 0 }}
                      />
                    </label>
                    <span className="muted" style={{ fontSize: "0.8em" }}>
                      listino € {euro(r.prezzo_listino)}
                    </span>
                  </>
                ) : (
                  <span>
                    {r.quantita} × € {euro(r.prezzo_unitario)}
                  </span>
                )}
              </div>
            ))}
            {modificabile ? (
              <>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <label style={{ margin: 0 }}>
                    Sconto totale
                    <input
                      inputMode="decimal"
                      value={s.sconto}
                      onChange={(e) => set(o, { sconto: e.target.value })}
                      style={{ width: "6rem", marginBottom: 0 }}
                    />
                  </label>
                  <select value={s.tipoSconto} onChange={(e) => set(o, { tipoSconto: e.target.value })} style={{ width: "auto", marginBottom: 0 }}>
                    <option value="eur">€</option>
                    <option value="pct">%</option>
                  </select>
                </div>
                <label>
                  Nota per l'ospite (spiega modifiche o rettifiche)
                  <textarea value={s.nota} onChange={(e) => set(o, { nota: e.target.value })} rows={2}></textarea>
                </label>
                <p style={{ margin: "0.3rem 0" }}>
                  Subtotale € {euro(lordo)}
                  {sconto > 0 ? ` · sconto − € ${euro(sconto)}` : ""} · <strong>Totale € {euro(totale)}</strong>
                </p>
                <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: 0 }}>
                  <button type="button" className="btn" onClick={() => conferma(o)}>
                    Conferma e avvisa l'ospite
                  </button>
                  <button type="button" className="btn btn-light" onClick={() => annulla(o)}>
                    Annulla la richiesta
                  </button>
                </p>
              </>
            ) : (
              <>
                {Number(o.sconto_totale) > 0 && <p className="descrizione">Sconto totale: € {euro(o.sconto_totale)}</p>}
                {o.note_admin && <p className="descrizione">Nota: {o.note_admin}</p>}
                <p style={{ margin: "0.3rem 0" }}>
                  <strong>Totale € {euro(o.totale)}</strong>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <main>
      <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <a href="/cantina" className="btn btn-light">
          &larr; Mappa
        </a>
        <a href="/cantina/indice" className="btn btn-light">
          Indice e vendita
        </a>
      </p>
      <h1>Ordini di vini</h1>
      {msg && <p style={{ color: msg.startsWith("Errore") ? "#a32d2d" : "#1f5c2e" }}>{msg}</p>}
      <h2>Da confermare ({daConfermare.length})</h2>
      {daConfermare.length === 0 && <p className="muted">Nessuna richiesta in attesa.</p>}
      {daConfermare.map(scheda)}
      <h2>Storico</h2>
      {altri.length === 0 && <p className="muted">Nessun ordine nello storico.</p>}
      {altri.map(scheda)}
    </main>
  );
}
