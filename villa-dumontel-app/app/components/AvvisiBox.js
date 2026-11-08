"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";
import PopupScheda, { RichiestaDettaglio } from "./PopupEvento";
import AllegatiEvento from "./AllegatiEvento";
import { periodoEvento } from "../../lib/eventi";
import { fmtData } from "../../lib/i18n";

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
  const [dettaglio, setDettaglio] = useState(null); // { evento } oppure { richiesta }

  const haTarget = (a) => !!(a.evento_id || a.richiesta_id);

  async function apriDettaglio(a) {
    if (a.evento_id) {
      const { data } = await supabase.from("eventi").select("*").eq("id", a.evento_id).maybeSingle();
      if (data) return setDettaglio({ evento: data });
    }
    if (a.richiesta_id) {
      const { data } = await supabase
        .from("richieste")
        .select("*, alloggi(nome), famiglie(nome)")
        .eq("id", a.richiesta_id)
        .maybeSingle();
      if (data) return setDettaglio({ richiesta: data });
    }
    window.location.href = destinazione;
  }

  const soloEventi = avvisi.length > 0 && avvisi.every((a) => a.evento_id);
  const soloOrdiniVini = avvisi.length > 0 && avvisi.every((a) => String(a.evento || "").startsWith("ordine_vini"));
  const soloVini = avvisi.length > 0 && avvisi.every((a) => a.evento === "vino_maturita");
  const destinazione = soloEventi
    ? "/calendario"
    : soloOrdiniVini
    ? tipo === "admin"
      ? "/cantina/ordini"
      : "/ospite/vini"
    : soloVini
    ? "/cantina/indice"
    : PAGINA[tipo];

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
    window.dispatchEvent(new Event("vd-avvisi"));
  }

  if (avvisi.length === 0 && !dettaglio) return null;

  const popup = dettaglio && (
    dettaglio.evento ? (
      <PopupScheda
        titolo={dettaglio.evento.titolo}
        sottotitolo={periodoEvento(dettaglio.evento, (d) => fmtData(lang, d))}
        onChiudi={() => setDettaglio(null)}
        azioneModifica={tipo === "admin" ? { href: "/calendario/evento?id=" + dettaglio.evento.id } : null}
      >
        {dettaglio.evento.note && (
          <div style={{ background: "#faf7ef", borderRadius: 8, padding: "0.6rem 0.8rem", margin: "0.5rem 0" }}>
            <strong style={{ fontSize: "0.88em" }}>{t("f.note")}</strong>
            <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{dettaglio.evento.note}</p>
          </div>
        )}
        <AllegatiEvento eventoId={dettaglio.evento.id} />
      </PopupScheda>
    ) : (
      <PopupScheda
        titolo={t("tipo." + dettaglio.richiesta.tipo)}
        sottotitolo={fmtData(lang, dettaglio.richiesta.data) + (dettaglio.richiesta.ora ? " · " + String(dettaglio.richiesta.ora).slice(0, 5) : "")}
        onChiudi={() => setDettaglio(null)}
        azioneModifica={{ href: (tipo === "admin" ? "/richieste?id=" : "/ospite/richieste?id=") + dettaglio.richiesta.id }}
      >
        <RichiestaDettaglio r={dettaglio.richiesta} admin={tipo === "admin"} />
      </PopupScheda>
    )
  );

  if (avvisi.length === 0) return popup;

  return (
    <>
    {popup}
    <div className="card" style={{ marginBottom: "1rem", background: "#eef2f9", borderLeft: "4px solid #2b6a9e" }}>
      <h2 style={{ marginTop: 0 }}>
        {t("av.titolo")} ({avvisi.length})
      </h2>
      {avvisi.map((a) => (
        <p key={a.id} style={{ margin: "0.35rem 0" }}>
          {lang === "en" ? a.testo_en : a.testo_it}
          {avvisi.length > 1 && haTarget(a) && (
            <>
              {" "}
              <button type="button" className="btn btn-light" style={{ padding: "0.15rem 0.6rem" }} onClick={() => apriDettaglio(a)}>
                {t("av.apri")}
              </button>
            </>
          )}
        </p>
      ))}
      <p style={{ margin: "0.6rem 0 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {avvisi.length === 1 && haTarget(avvisi[0]) ? (
          <button type="button" className="btn btn-light" onClick={() => apriDettaglio(avvisi[0])}>
            {t("av.apri")}
          </button>
        ) : (
          !giaQui && (
            <a href={destinazione} className="btn btn-light">
              {t("av.apri")}
            </a>
          )
        )}
        <button type="button" className="btn" onClick={segnaLetti}>
          {t("av.letti")}
        </button>
      </p>
    </div>
    </>
  );
}
