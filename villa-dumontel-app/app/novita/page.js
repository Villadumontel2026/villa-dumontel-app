"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { fmtData } from "../../lib/i18n";

export default function NovitaPage() {
  const { t, lang } = useApp();
  const [righe, setRighe] = useState(null);

  useEffect(() => {
    supabase
      .from("novita")
      .select("*")
      .eq("attiva", true)
      .order("data_pubblicazione", { ascending: false })
      .then(({ data }) => setRighe(data || []));
  }, []);

  const titolo = (n) => (lang === "en" && n.titolo_en) || n.titolo_it;
  const testo = (n) => (lang === "en" && n.testo_en) || n.testo_it;

  return (
    <main>
      <h1>{t("nov.titolo")}</h1>
      {righe === null && <p>{t("c.caricamento")}</p>}
      {righe && righe.length === 0 && <p className="muted">{t("nov.vuoto")}</p>}
      <div style={{ display: "grid", gap: "1rem" }}>
        {(righe || []).map((n) => (
          <div key={n.id} className="card">
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
              {fmtData(lang, n.data_pubblicazione)}
            </p>
            <h2 style={{ margin: "0.2rem 0 0.4rem" }}>{titolo(n)}</h2>
            {testo(n) && <p style={{ whiteSpace: "pre-line", margin: "0.25rem 0" }}>{testo(n)}</p>}
            {n.link && (
              <p style={{ margin: "0.5rem 0 0" }}>
                <a href={n.link} className="btn btn-light">
                  {t("nov.apri")}
                </a>
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
