"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { dmy } from "../../lib/i18n";
import {
  oggiRoma,
  occupazione,
  periodoAffitto,
  ETICHETTE_OCCUPAZIONE,
  COLORI_OCCUPAZIONE,
  ETICHETTE_PULIZIA,
  COLORI_PULIZIA,
} from "../../lib/alloggi";

const badge = (c, testo) => (
  <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "0.15rem 0.7rem", fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap" }}>
    {testo}
  </span>
);

// Home admin: per ogni appartamento (famiglia) periodo di affitto, occupazione e stato delle pulizie
export default function AppartamentiBox({ famiglie, eventi }) {
  const [affitti, setAffitti] = useState([]);
  const [stati, setStati] = useState([]);
  const [alloggi, setAlloggi] = useState([]);
  const oggi = useMemo(() => oggiRoma(), []);

  async function carica() {
    const [a, s, l] = await Promise.all([
      supabase.from("affitti").select("*"),
      supabase.from("stato_alloggi").select("*"),
      supabase.from("alloggi").select("id, nome, famiglia_id"),
    ]);
    setAffitti(a.data || []);
    setStati(s.data || []);
    setAlloggi(l.data || []);
  }

  useEffect(() => {
    // allinea subito gli stati "da pulire" alle fine soggiorno gia' passate
    supabase.rpc("aggiorna_stati_alloggi").then(() => carica(), () => carica());
  }, []);

  async function impostaPulizia(famigliaId, pulizia) {
    const { error } = await supabase
      .from("stato_alloggi")
      .upsert({ famiglia_id: famigliaId, pulizia, da_confermare: false, aggiornato_il: new Date().toISOString() }, { onConflict: "famiglia_id" });
    if (error) return alert("Errore: " + error.message);
    await carica();
  }

  async function confermaPulito(famigliaId) {
    const { error } = await supabase
      .from("stato_alloggi")
      .update({ pulizia: "pulito", da_confermare: false, aggiornato_il: new Date().toISOString() })
      .eq("famiglia_id", famigliaId);
    if (error) return alert("Errore: " + error.message);
    await carica();
  }

  if (!famiglie || famiglie.length === 0) return null;

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2>Appartamenti</h2>
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {famiglie.map((f) => {
          const occ = occupazione(f.id, eventi, oggi);
          const aff = periodoAffitto(f.id, affitti, oggi);
          const st = stati.find((x) => x.famiglia_id === f.id) || { pulizia: "pulito", da_confermare: false };
          const nomiAlloggi = alloggi.filter((a) => a.famiglia_id === f.id).map((a) => a.nome).join(" + ");
          return (
            <div key={f.id} className="card">
              <h3 style={{ margin: "0 0 0.15rem" }}>{f.nome}</h3>
              {nomiAlloggi && <p className="muted" style={{ margin: "0 0 0.6rem" }}>{nomiAlloggi}</p>}

              <p style={{ margin: "0.35rem 0" }}>
                <span className="muted">Affitto: </span>
                {aff ? (
                  <>
                    dal {dmy(aff.dal)} {aff.al ? "al " + dmy(aff.al) : "(senza scadenza)"}
                    {aff.quando !== "in corso" && <span className="muted"> ({aff.quando})</span>}
                  </>
                ) : (
                  <span className="muted">non indicato (lo imposti da Calendario)</span>
                )}
              </p>

              <p style={{ margin: "0.5rem 0 0.15rem" }}>
                <span className="muted">Occupazione: </span>
                {badge(COLORI_OCCUPAZIONE[occ.stato], ETICHETTE_OCCUPAZIONE[occ.stato])}
              </p>
              <p className="descrizione" style={{ margin: "0 0 0.4rem" }}>
                {occ.stato === "occupato" &&
                  `dal ${dmy(occ.arrivo)} ${occ.fine ? "al " + dmy(occ.fine) : "— fine soggiorno da indicare"}`}
                {occ.stato === "prenotato" && `arrivo il ${dmy(occ.arrivo)}${occ.fine ? " — partenza " + dmy(occ.fine) : ""}`}
                {occ.stato === "libero" && "nessun arrivo in programma"}
                {occ.note ? ` · ${occ.note}` : ""}
                {occ.stato === "occupato" && occ.prossimoArrivo ? ` · prossimo arrivo ${dmy(occ.prossimoArrivo)}` : ""}
              </p>

              <p style={{ margin: "0.5rem 0 0.35rem" }}>
                <span className="muted">Pulizie: </span>
                {badge(COLORI_PULIZIA[st.pulizia], ETICHETTE_PULIZIA[st.pulizia])}
                {st.da_confermare && <span style={{ marginLeft: "0.4rem", color: "#8a5a00", fontSize: "0.9rem" }}>da confermare</span>}
              </p>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                {st.da_confermare && (
                  <button type="button" className="btn" style={{ padding: "0.3rem 0.8rem" }} onClick={() => confermaPulito(f.id)}>
                    Conferma pulito
                  </button>
                )}
                {["da_pulire", "in_corso", "pulito"]
                  .filter((k) => !(k === st.pulizia && !st.da_confermare))
                  .filter((k) => !(st.da_confermare && k === "pulito"))
                  .map((k) => (
                    <button key={k} type="button" className="btn btn-light" style={{ padding: "0.3rem 0.8rem" }} onClick={() => impostaPulizia(f.id, k)}>
                      {ETICHETTE_PULIZIA[k]}
                    </button>
                  ))}
              </div>

              <p style={{ margin: 0, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <a href={"/calendario/evento?tipo=arrivo&fam=" + f.id} className="btn btn-light" style={{ padding: "0.3rem 0.8rem" }}>
                  Registra arrivo
                </a>
                <a href={"/calendario/evento?tipo=partenza&fam=" + f.id} className="btn btn-light" style={{ padding: "0.3rem 0.8rem" }}>
                  Registra fine soggiorno
                </a>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
