"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";

const PAGINA = {
  admin: "/richieste",
  famiglia: "/ospite/richieste",
  collaboratore: "/pulizie/collaboratore",
};

// Avvisi non letti per un destinatario: tipo = admin | famiglia | collaboratore
export default function AvvisiBox({ tipo, id = null }) {
  const { t, lang } = useApp();
  const [avvisi, setAvvisi] = useState([]);
  const [giaQui, setGiaQui] = useState(false);

  const soloEventi = avvisi.length > 0 && avvisi.every((a) => a.evento_id);
  const destinazione = soloEventi ? "/calendario" : PAGINA[tipo];

  useEffect(() => {
    setGiaQui(window.location.pathname.replace(/\/$/, "") === destinazione);
  }, [tipo, destinazione]);

  async function carica() {
    let q = supabase
      .from("avvisi")
      .select("*")
      .eq("destinatario_tipo", tipo)
      .eq("letto", false)
      .order("creato_il", { ascending: false })
      .limit(10);
    q = id === null ? q.is("destinatario_id", null) : q.eq("destinatario_id", id);
    const { data } = await q;
    setAvvisi(data || []);
  }

  useEffect(() => {
    carica();
  }, [tipo, id]);

  async function segnaLetti() {
    await supabase.rpc("segna_avvisi_letti", { p_tipo: tipo, p_id: id });
    setAvvisi([]);
  }

  if (avvisi.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: "1rem", background: "#eef2f9", borderLeft: "4px solid #2b6a9e" }}>
      <h2 style={{ marginTop: 0 }}>
        {t("av.titolo")} ({avvisi.length})
      </h2>
      {avvisi.map((a) => (
        <p key={a.id} style={{ margin: "0.35rem 0" }}>
          {lang === "en" ? a.testo_en : a.testo_it}
        </p>
      ))}
      <p style={{ margin: "0.6rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {!giaQui && (
          <a href={destinazione} className="btn btn-light">
            {t("av.apri")}
          </a>
        )}
        <button type="button" className="btn" onClick={segnaLetti}>
          {t("av.letti")}
        </button>
      </p>
    </div>
  );
}
