"use client";

import { campo } from "../../../lib/lingua";
import ModificaLingue, { CampoLingue } from "../../components/ModificaLingue";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useApp } from "../../components/AppProvider";
import PopupScheda from "../../components/PopupEvento";
import { Matita, Piu } from "../../components/IconeAzione";

const VUOTA = { ordine: 100, titolo_it: "", titolo_en: "", testo_it: "", testo_en: "", link_url: "", link_etichetta_it: "", link_etichetta_en: "", attiva: true };

export default function InfoUtiliPage() {
  const { t, lang, ruolo, email, pronto } = useApp();
  const [voci, setVoci] = useState([]);
  const [caricato, setCaricato] = useState(false);
  const [errore, setErrore] = useState(null);
  const [nuova, setNuova] = useState(false);
  const [editId, setEditId] = useState(null);

  async function carica() {
    const { data } = await supabase.from("info_voci").select("*").order("ordine", { ascending: true }).order("id", { ascending: true });
    setVoci(data || []);
    setCaricato(true);
  }

  useEffect(() => {
    if (pronto) carica();
  }, [pronto, email]);

  const admin = ruolo === "admin";
  const L = (it, en, fr) => campo({ it, en, fr }, "", lang);

  async function salva(e, id) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const v = (n) => (f[n].value ? f[n].value.trim() : null);
    const riga = {
      ordine: f.ordine.value ? parseInt(f.ordine.value, 10) : 100,
      titolo_it: v("titolo_it"),
      titolo_en: v("titolo_en"),
      titolo_fr: v("titolo_fr"),
      testo_fr: v("testo_fr"),
      link_etichetta_fr: v("link_etichetta_fr"),
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
    setEditId(null);
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
        <ModificaLingue>
          <CampoLingue etichetta="Titolo" nomi={{ it: "titolo_it", en: "titolo_en", fr: "titolo_fr" }} valori={{ it: v.titolo_it, en: v.titolo_en, fr: v.titolo_fr }} richiesto />
          <CampoLingue etichetta="Testo" area righe={4} nomi={{ it: "testo_it", en: "testo_en", fr: "testo_fr" }} valori={{ it: v.testo_it, en: v.testo_en, fr: v.testo_fr }} />
          <label>
            Link (https://...)
            <input type="url" name="link_url" defaultValue={v.link_url || ""} />
          </label>
          <CampoLingue etichetta="Testo del pulsante" nomi={{ it: "link_etichetta_it", en: "link_etichetta_en", fr: "link_etichetta_fr" }} valori={{ it: v.link_etichetta_it, en: v.link_etichetta_en, fr: v.link_etichetta_fr }} />
        </ModificaLingue>
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>{t("i.utili")}</h1>
        {admin && caricato && <Piu onClick={() => setNuova(true)} titolo="Aggiungi una voce" />}
      </div>

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
          <div key={v.id} className="card" style={{ opacity: v.attiva ? 1 : 0.55, position: "relative" }}>
            <h2 style={{ marginTop: 0, paddingRight: "2.2rem" }}>{L(v.titolo_it, v.titolo_en, v.titolo_fr)}{!v.attiva ? " (nascosta)" : ""}</h2>
            {L(v.testo_it, v.testo_en, v.testo_fr) && <p style={{ whiteSpace: "pre-line" }}>{L(v.testo_it, v.testo_en, v.testo_fr)}</p>}
            {v.link_url && (
              <p style={{ margin: "0.5rem 0 0" }}>
                <a href={v.link_url} target="_blank" rel="noreferrer" className="btn">
                  {L(v.link_etichetta_it, v.link_etichetta_en, v.link_etichetta_fr) || (lang === "en" ? "Open link" : lang === "fr" ? "Ouvrir le lien" : "Apri il link")}
                </a>
              </p>
            )}
            {admin && (
              <span style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}>
                <Matita onClick={() => setEditId(v.id)} titolo="Modifica" />
              </span>
            )}
          </div>
        ))}
      </div>

      {admin && nuova && (
        <PopupScheda titolo="Nuova voce" onChiudi={() => setNuova(false)} larga>
          {form(VUOTA, null)}
        </PopupScheda>
      )}
      {admin && editId && (() => {
        const v = voci.find((x) => x.id === editId);
        if (!v) return null;
        return (
          <PopupScheda titolo={L(v.titolo_it, v.titolo_en, v.titolo_fr)} sottotitolo="Modifica" onChiudi={() => setEditId(null)} larga>
            {form(v, v.id)}
            <button type="button" className="btn btn-light" style={{ marginTop: "0.5rem" }} onClick={() => elimina(v.id)}>
              Elimina
            </button>
          </PopupScheda>
        );
      })()}
    </main>
  );
}
