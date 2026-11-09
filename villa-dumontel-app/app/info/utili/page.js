"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useApp } from "../../components/AppProvider";

const VUOTA = { ordine: 100, titolo_it: "", titolo_en: "", testo_it: "", testo_en: "", link_url: "", link_etichetta_it: "", link_etichetta_en: "", attiva: true };

export default function InfoUtiliPage() {
  const { t, lang, ruolo, email, pronto } = useApp();
  const [voci, setVoci] = useState([]);
  const [caricato, setCaricato] = useState(false);
  const [errore, setErrore] = useState(null);
  const [nuova, setNuova] = useState(false);

  async function carica() {
    const { data } = await supabase.from("info_voci").select("*").order("ordine", { ascending: true }).order("id", { ascending: true });
    setVoci(data || []);
    setCaricato(true);
  }

  useEffect(() => {
    if (pronto) carica();
  }, [pronto, email]);

  const admin = ruolo === "admin";
  const L = (it, en) => (lang === "en" ? en || it : it || en);

  async function salva(e, id) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const v = (n) => (f[n].value ? f[n].value.trim() : null);
    const riga = {
      ordine: f.ordine.value ? parseInt(f.ordine.value, 10) : 100,
      titolo_it: v("titolo_it"),
      titolo_en: v("titolo_en"),
      testo_it: v("testo_it"),
      testo_en: v("testo_en"),
      link_url: v("link_url"),
      link_etichetta_it: v("link_etichetta_it"),
      link_etichetta_en: v("link_etichetta_en"),
      attiva: f.attiva.checked,
    };
    if (!riga.titolo_it) return setErrore("Il titolo in italiano è obbligatorio.");
    const { error } = id ? await supabase.from("info_voci").update(riga).eq("id", id) : await supabase.from("info_voci").insert(riga);
    if (error) return setErrore("Errore: " + error.message);
    setNuova(false);
    await carica();
  }

  async function elimina(id) {
    if (!window.confirm("Eliminare questa voce?")) return;
    const { error } = await supabase.from("info_voci").delete().eq("id", id);
    if (error) return setErrore("Errore: " + error.message);
    await carica();
  }

  function form(v, id) {
    return (
      <form onSubmit={(e) => salva(e, id)} style={{ marginTop: "0.75rem" }}>
        <label>
          Ordine (numero più basso = più in alto)
          <input type="number" name="ordine" defaultValue={v.ordine} />
        </label>
        <label>
          Titolo — italiano
          <input type="text" name="titolo_it" defaultValue={v.titolo_it || ""} required />
        </label>
        <label>
          Titolo — inglese
          <input type="text" name="titolo_en" defaultValue={v.titolo_en || ""} />
        </label>
        <label>
          Testo — italiano
          <textarea name="testo_it" rows={4} defaultValue={v.testo_it || ""}></textarea>
        </label>
        <label>
          Testo — inglese
          <textarea name="testo_en" rows={4} defaultValue={v.testo_en || ""}></textarea>
        </label>
        <label>
          Link (https://...)
          <input type="url" name="link_url" defaultValue={v.link_url || ""} />
        </label>
        <label>
          Testo del pulsante — italiano
          <input type="text" name="link_etichetta_it" defaultValue={v.link_etichetta_it || ""} />
        </label>
        <label>
          Testo del pulsante — inglese
          <input type="text" name="link_etichetta_en" defaultValue={v.link_etichetta_en || ""} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 400 }}>
          <input type="checkbox" name="attiva" defaultChecked={v.attiva !== false} style={{ width: "auto", marginBottom: 0 }} />
          Visibile agli ospiti
        </label>
        <button type="submit" className="btn">
          Salva
        </button>
      </form>
    );
  }

  return (
    <main>
      <p>
        <a href="/info" className="btn btn-light">
          {t("i.back")}
        </a>
      </p>
      <h1>{t("i.utili")}</h1>

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

      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      {caricato && voci.length === 0 && <p className="muted">—</p>}

      <div style={{ display: "grid", gap: "1rem" }}>
        {voci.map((v) => (
          <div key={v.id} className="card" style={{ opacity: v.attiva ? 1 : 0.55 }}>
            <h2 style={{ marginTop: 0 }}>{L(v.titolo_it, v.titolo_en)}</h2>
            {L(v.testo_it, v.testo_en) && <p style={{ whiteSpace: "pre-line" }}>{L(v.testo_it, v.testo_en)}</p>}
            {v.link_url && (
              <p style={{ margin: "0.5rem 0 0" }}>
                <a href={v.link_url} target="_blank" rel="noreferrer" className="btn">
                  {L(v.link_etichetta_it, v.link_etichetta_en) || (lang === "en" ? "Open link" : "Apri il link")}
                </a>
              </p>
            )}
            {admin && (
              <details style={{ marginTop: "0.75rem" }}>
                <summary style={{ cursor: "pointer" }}>Modifica (solo admin){!v.attiva ? " — nascosta" : ""}</summary>
                {form(v, v.id)}
                <button type="button" className="btn btn-light" style={{ marginTop: "0.5rem" }} onClick={() => elimina(v.id)}>
                  Elimina
                </button>
              </details>
            )}
          </div>
        ))}
      </div>

      {admin && caricato && (
        <details className="card" style={{ marginTop: "1.5rem", borderLeft: "4px solid var(--color-accent)" }} open={nuova} onToggle={(e) => setNuova(e.target.open)}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Aggiungi una voce (solo admin)</summary>
          {nuova && form(VUOTA, null)}
        </details>
      )}
    </main>
  );
}
