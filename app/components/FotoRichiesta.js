"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";
import { salvaFoto, urlFoto } from "../../lib/foto";

// Foto collegate a una richiesta o a una manutenzione. Con puoAggiungere si possono caricare altre foto.
export default function FotoRichiesta({ richiestaId = null, manutenzioneId = null, famigliaId = null, puoAggiungere = false }) {
  const { lang, ruolo } = useApp();
  const en = lang === "en";
  const [foto, setFoto] = useState([]);
  const [errore, setErrore] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const camera = useRef(null);
  const galleria = useRef(null);

  async function carica() {
    let q = supabase.from("foto_richieste").select("id, percorso, creato_da").order("creato_il", { ascending: true });
    q = richiestaId ? q.eq("richiesta_id", richiestaId) : q.eq("manutenzione_id", manutenzioneId);
    const { data } = await q;
    const out = [];
    for (const f of data || []) out.push({ ...f, url: await urlFoto(f.percorso) });
    setFoto(out);
  }

  useEffect(() => {
    if (richiestaId || manutenzioneId) carica();
  }, [richiestaId, manutenzioneId]);

  async function aggiungi(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setOccupato(true);
    setErrore(null);
    const err = await salvaFoto(files, { famiglia_id: famigliaId, richiesta_id: richiestaId, manutenzione_id: manutenzioneId });
    setOccupato(false);
    if (err) setErrore(err);
    await carica();
  }

  async function togli(f) {
    if (!window.confirm(en ? "Remove this photo?" : "Eliminare questa foto?")) return;
    const { error } = await supabase.from("foto_richieste").delete().eq("id", f.id);
    if (error) return setErrore(error.message);
    await supabase.storage.from("foto_richieste").remove([f.percorso]);
    await carica();
  }

  if (!foto.length && !puoAggiungere) return null;
  return (
    <div style={{ margin: "0.6rem 0" }}>
      {foto.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {foto.map((f) => (
            <div key={f.id} style={{ position: "relative" }}>
              <a href={f.url || "#"} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url || ""} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8, display: "block" }} />
              </a>
              {puoAggiungere && ruolo === "admin" && (
                <button
                  type="button"
                  aria-label={en ? "Remove" : "Elimina"}
                  onClick={() => togli(f)}
                  style={{ position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: 999, border: "none", background: "#26261f", color: "white", cursor: "pointer", lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {puoAggiungere && (
        <p style={{ margin: "0.5rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-light" disabled={occupato} onClick={() => camera.current && camera.current.click()}>
            {en ? "Take a photo" : "Scatta una foto"}
          </button>
          <button type="button" className="btn btn-light" disabled={occupato} onClick={() => galleria.current && galleria.current.click()}>
            {en ? "Add from photos" : "Aggiungi dalle foto"}
          </button>
          {occupato && <span className="muted">{en ? "Uploading…" : "Caricamento…"}</span>}
        </p>
      )}
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={aggiungi} style={{ display: "none" }} />
      <input ref={galleria} type="file" accept="image/*" multiple onChange={aggiungi} style={{ display: "none" }} />
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
    </div>
  );
}
