"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";
import { apriDocumento } from "../../lib/documenti";
import { Graffetta } from "./IconeAzione";

// Allegati di un evento del calendario (si caricano solo quando l'evento viene aperto)
export default function AllegatiEvento({ eventoId }) {
  const { t } = useApp();
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    let vivo = true;
    supabase
      .from("eventi_documenti")
      .select("documenti(id, nome, percorso)")
      .eq("evento_id", eventoId)
      .then(({ data }) => {
        if (vivo) setDocs((data || []).map((r) => r.documenti).filter(Boolean));
      });
    return () => {
      vivo = false;
    };
  }, [eventoId]);

  if (docs.length === 0) return null;
  return (
    <div style={{ margin: "0.4rem 0" }}>
      <strong style={{ fontSize: "0.9rem" }}>{t("ev.allegati")}</strong>
      {docs.map((d) => (
        <p key={d.id} className="descrizione" style={{ margin: "0.15rem 0" }}>
          <Graffetta titolo={t("doc.apri")} onClick={() => apriDocumento(d)} />
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              apriDocumento(d);
            }}
          >
            {d.nome}
          </a>
          {" · "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              apriDocumento(d, true);
            }}
          >
            {t("doc.scarica")}
          </a>
        </p>
      ))}
    </div>
  );
}
