"use client";

import { useEffect, useState } from "react";
import { applicaVista } from "../../../lib/vista";
import { supabase } from "../../../lib/supabaseClient";
import FormRichiesta from "../../components/FormRichiesta";
import { useApp } from "../../components/AppProvider";

const TIPI_VALIDI = ["trasporto", "ristorante", "attivita", "pulizie"];

export default function PrenotaOspitePage() {
  const { t } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [profilo, setProfilo] = useState(null);
  const [alloggi, setAlloggi] = useState([]);
  const [posti, setPosti] = useState([]);
  const [iniziale, setIniziale] = useState({ tipo: "ristorante", nome: "" });
  const [inviata, setInviata] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    async function carica() {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tipo");
      setIniziale({
        tipo: t && TIPI_VALIDI.includes(t) ? t : "ristorante",
        nome: params.get("nome") || "",
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErroreAccesso("login");
        setCaricamento(false);
        return;
      }

      const { data: pRaw } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();
      const p = applicaVista(pRaw);

      if (!p || p.ruolo !== "ospite" || !p.famiglia_id) {
        setErroreAccesso("ospiti");
        setCaricamento(false);
        return;
      }
      setProfilo(p);

      const { data: alloggiData } = await supabase
        .from("alloggi")
        .select("*")
        .eq("famiglia_id", p.famiglia_id);
      setAlloggi(alloggiData || []);

      const { data: postiData } = await supabase
        .from("posti")
        .select("id, nome, categoria, sotto_categoria")
        .in("categoria", ["ristorante", "attivita"])
        .order("id", { ascending: true });
      setPosti(postiData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  async function invia(valori) {
    setInviata(false);
    setErrore(null);
    const { error } = await supabase.from("richieste").insert({
      ...valori,
      famiglia_id: profilo.famiglia_id,
      stato: "nuova",
    });
    if (error) return t("c.errore") + error.message;
    setInviata(true);
    return null;
  }

  if (caricamento) {
    return (
      <main>
        <p>{t("c.caricamento")}</p>
      </main>
    );
  }

  if (erroreAccesso) {
    return (
      <main>
        <div className="card">
          <p>{erroreAccesso === "login" ? t("c.loginRichiesto") : t("c.soloOspiti")}</p>
          <p>
            <a href="/login" className="btn">
              {t("c.vaiLogin")}
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>{t("pr.titolo")}</h1>

      {inviata && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p>
            {t("pr.inviata")} <a href="/ospite/richieste" className="btn btn-light">
              {t("pr.vedi")}
            </a>
          </p>
        </div>
      )}
      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <FormRichiesta
          key={iniziale.tipo + iniziale.nome + posti.length}
          alloggi={alloggi}
          posti={posti}
          tipoIniziale={iniziale.tipo}
          nomeIniziale={iniziale.nome}
          onSubmit={invia}
          etichettaBottone={t("pr.invia")}
        />
      </div>

    </main>
  );
}
