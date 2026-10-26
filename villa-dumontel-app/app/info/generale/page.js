"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useApp } from "../../components/AppProvider";

export default function InfoGeneralePage() {
  const { t, lang, ruolo, email, pronto } = useApp();
  const [info, setInfo] = useState(null);
  const [caricato, setCaricato] = useState(false);
  const [errore, setErrore] = useState(null);

  async function carica() {
    const { data } = await supabase.from("info_generale").select("*").eq("id", 1).maybeSingle();
    setInfo(data);
    setCaricato(true);
  }

  useEffect(() => {
    if (pronto) carica();
  }, [pronto, email]);

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const v = (n) => (f[n].value ? f[n].value : null);
    const { error } = await supabase.from("info_generale").upsert({
      id: 1,
      contatti: v("contatti"),
      wifi_rete: v("wifi_rete"),
      wifi_password: v("wifi_password"),
      indirizzo: v("indirizzo"),
      note_it: v("note_it"),
      note_en: v("note_en"),
    });
    if (error) return setErrore("Errore: " + error.message);
    await carica();
  }

  const nota = info && (lang === "it" ? info.note_it || info.note_en : info.note_en || info.note_it);

  return (
    <main>
      <p>
        <a href="/info" className="btn btn-light">
          {t("i.back")}
        </a>
      </p>
      <h1>{t("i.gen")}</h1>

      {pronto && !email && (
        <div className="card">
          <p>{t("c.loginRichiesto")}</p>
          <p>
            <a href="/login" className="btn">
              {t("c.vaiLogin")}
            </a>
          </p>
        </div>
      )}

      {caricato && info && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2>{t("i.contatti")}</h2>
            <p style={{ whiteSpace: "pre-line" }}>{info.contatti}</p>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2>{t("i.wifi")}</h2>
            <p>
              {t("i.rete")}: <strong>{info.wifi_rete}</strong>
              <br />
              {t("i.pass")}: <strong>{info.wifi_password}</strong>
            </p>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2>{t("i.indirizzo")}</h2>
            <p>{info.indirizzo}</p>
          </div>

          {nota && (
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <p style={{ whiteSpace: "pre-line", margin: 0 }}>{nota}</p>
            </div>
          )}

          {ruolo === "admin" && (
            <details className="card" style={{ borderLeft: "4px solid var(--color-accent)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Modifica le informazioni (solo admin)</summary>
              <form onSubmit={salva} style={{ marginTop: "0.75rem" }}>
                <label>
                  Contatti (una riga per nome, telefono, email; riga vuota per separare)
                  <textarea name="contatti" rows={8} defaultValue={info.contatti || ""}></textarea>
                </label>
                <label>
                  Wi-fi: nome della rete
                  <input type="text" name="wifi_rete" defaultValue={info.wifi_rete || ""} />
                </label>
                <label>
                  Wi-fi: password
                  <input type="text" name="wifi_password" defaultValue={info.wifi_password || ""} />
                </label>
                <label>
                  Indirizzo
                  <input type="text" name="indirizzo" defaultValue={info.indirizzo || ""} />
                </label>
                <label>
                  Nota — italiano (facoltativa)
                  <textarea name="note_it" defaultValue={info.note_it || ""}></textarea>
                </label>
                <label>
                  Nota — inglese (facoltativa)
                  <textarea name="note_en" defaultValue={info.note_en || ""}></textarea>
                </label>
                {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
                <button type="submit" className="btn">
                  Salva
                </button>
              </form>
            </details>
          )}
        </>
      )}

      {caricato && !info && email && (
        <div className="card">
          <p className="muted">
            {ruolo === "admin"
              ? "Le informazioni non sono ancora state create: esegui lo SQL avvisi_modifiche_info.sql."
              : "—"}
          </p>
        </div>
      )}
    </main>
  );
}
