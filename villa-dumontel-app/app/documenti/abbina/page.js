"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { dmy } from "../../../lib/i18n";
import { INDICE_FATTURE } from "../../../lib/indice_fatture";

const giorni = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);
const chiaveDoc = (d) => (d.note ? d.note + "/" : "") + d.nome;
const euro = (n) => Number(n).toFixed(2);

export default function AbbinaFatturePage() {
  const [stato, setStato] = useState("caricamento");
  const [docs, setDocs] = useState([]);
  const [spese, setSpese] = useState([]);
  const [famiglie, setFamiglie] = useState([]);
  const [collegati, setCollegati] = useState(new Set()); // "docId:spesaId"
  const [scelti, setScelti] = useState({}); // "docId:spesaId" -> bool
  const [messaggio, setMessaggio] = useState(null);

  async function carica() {
    const [d, s, f, c] = await Promise.all([
      supabase.from("documenti").select("id, nome, note, categoria").limit(2000),
      supabase.from("spese_famiglia").select("id, famiglia_id, oggetto, data, importo, famiglie(nome)").limit(5000),
      supabase.from("famiglie").select("id, nome, test"),
      supabase.from("documenti_spese").select("documento_id, spesa_id").limit(10000),
    ]);
    setDocs(d.data || []);
    setSpese(s.data || []);
    setFamiglie(f.data || []);
    setCollegati(new Set((c.data || []).map((r) => r.documento_id + ":" + r.spesa_id)));
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

  const proposte = useMemo(() => {
    const reali = famiglie.filter((f) => !f.test).map((f) => f.id);
    const speseLuce = spese.filter((s) => /electric|elettric|luce/i.test(s.oggetto || ""));
    const righe = [];
    docs.forEach((doc) => {
      const info = INDICE_FATTURE[chiaveDoc(doc)];
      if (!info || !info[0]) return;
      const [data, totale] = info;
      const cartella = doc.note || "";
      let fams;
      let comune = false;
      if (cartella.startsWith("Alloggio 1")) fams = [1];
      else if (cartella.startsWith("Alloggio 2")) fams = [2];
      else {
        fams = reali;
        comune = true;
      }
      const cand = speseLuce.filter((s) => fams.includes(s.famiglia_id) && giorni(s.data, data) <= 10);
      const esatte = totale == null ? [] : cand.filter((s) => Math.abs(Number(s.importo) - totale) < 0.02);
      let scelte = [];
      let affidabilita = "";
      if (!comune && esatte.length >= 1) {
        // se piu' esatte nella stessa famiglia prendo la piu' vicina per data
        scelte = [esatte.sort((a, b) => giorni(a.data, data) - giorni(b.data, data))[0]];
        affidabilita = "alta";
      } else if (!comune && cand.length === 1) {
        scelte = cand;
        affidabilita = "media";
      } else if (comune && cand.length > 0) {
        scelte = cand;
        affidabilita = "media";
      }
      const nuove = scelte.filter((s) => !collegati.has(doc.id + ":" + s.id));
      if (scelte.length === 0) righe.push({ doc, data, totale, scelte: [], affidabilita: "nessuna", fatto: false });
      else righe.push({ doc, data, totale, scelte, affidabilita, fatto: nuove.length === 0 });
    });
    return righe.sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  }, [docs, spese, famiglie, collegati]);

  // preseleziona le proposte affidabili
  useEffect(() => {
    setScelti((prev) => {
      const n = { ...prev };
      proposte.forEach((p) => {
        if (p.fatto) return;
        p.scelte.forEach((s) => {
          const k = p.doc.id + ":" + s.id;
          if (!(k in n)) n[k] = p.affidabilita === "alta";
        });
      });
      return n;
    });
  }, [proposte]);

  async function collega() {
    const righe = [];
    Object.entries(scelti).forEach(([k, v]) => {
      if (!v || collegati.has(k)) return;
      const [documento_id, spesa_id] = k.split(":").map(Number);
      righe.push({ documento_id, spesa_id });
    });
    if (righe.length === 0) return setMessaggio("Niente da collegare.");
    const { error } = await supabase.from("documenti_spese").upsert(righe, { onConflict: "documento_id,spesa_id" });
    if (error) return setMessaggio("Errore: " + error.message);
    setMessaggio(`Collegati ${righe.length} abbinamenti.`);
    await carica();
  }

  if (stato === "caricamento") return <main><p>Caricamento...</p></main>;
  if (stato !== "ok")
    return (
      <main>
        <div className="card">
          <p>{stato === "login" ? "Devi accedere." : "Pagina riservata all'amministratore."}</p>
          <a href="/login" className="btn">Vai al login</a>
        </div>
      </main>
    );

  const daFare = proposte.filter((p) => !p.fatto && p.scelte.length > 0);
  const senza = proposte.filter((p) => p.scelte.length === 0);
  const fatte = proposte.filter((p) => p.fatto);
  const nSel = Object.entries(scelti).filter(([k, v]) => v && !collegati.has(k)).length;

  return (
    <main>
      <p>
        <a href="/documenti" className="btn btn-light">&larr; Documenti</a>
      </p>
      <h1>Abbina fatture alle spese</h1>
      <p className="muted">
        Confronto data e totale di ogni bolletta della luce con le spese gia' registrate. Le proposte con stesso importo sono gia'
        spuntate; le altre (solo data, o bollette delle spese comuni con quote diverse) le spunti tu dopo averle controllate.
      </p>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: 0 }}>
          <strong>{daFare.length}</strong> da collegare · <strong>{fatte.length}</strong> gia' collegate ·{" "}
          <strong>{senza.length}</strong> senza spesa corrispondente
        </p>
        <p style={{ margin: "0.75rem 0 0" }}>
          <button type="button" className="btn" onClick={collega} disabled={nSel === 0}>
            Collega i {nSel} selezionati
          </button>
          {messaggio && <span className="muted" style={{ marginLeft: "0.75rem" }}>{messaggio}</span>}
        </p>
      </div>

      <h2>Da collegare</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {daFare.length === 0 && <p className="muted">Niente da collegare.</p>}
        {daFare.map((p) => (
          <div key={p.doc.id} className="richiesta-item">
            <strong>{p.doc.nome}</strong>
            <span className="muted" style={{ fontSize: "0.85em" }}> · {p.doc.note}</span>
            <p className="descrizione">
              Bolletta del {dmy(p.data)}{p.totale != null ? ` — ${euro(p.totale)} €` : ""} · affidabilita' {p.affidabilita}
            </p>
            {p.scelte.map((s) => {
              const k = p.doc.id + ":" + s.id;
              if (collegati.has(k)) return null;
              return (
                <label key={s.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400, margin: "0.15rem 0" }}>
                  <input
                    type="checkbox"
                    checked={!!scelti[k]}
                    onChange={(e) => setScelti((prev) => ({ ...prev, [k]: e.target.checked }))}
                    style={{ width: "auto", margin: 0 }}
                  />
                  {s.famiglie?.nome} — {s.oggetto} — {dmy(s.data)} — {euro(s.importo)} €
                </label>
              );
            })}
          </div>
        ))}
      </div>

      {senza.length > 0 && (
        <>
          <h2>Senza spesa corrispondente</h2>
          <p className="muted">Nessuna spesa "Electricity" vicina a quella data: o non e' ancora registrata, o ha un altro nome. Si possono collegare a mano dalla graffetta in Spese.</p>
          <div className="card">
            {senza.map((p) => (
              <div key={p.doc.id} className="richiesta-item">
                <strong>{p.doc.nome}</strong>
                <span className="muted" style={{ fontSize: "0.85em" }}> · {p.doc.note}</span>
                <p className="descrizione">
                  Bolletta del {dmy(p.data)}{p.totale != null ? ` — ${euro(p.totale)} €` : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
