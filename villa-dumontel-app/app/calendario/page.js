"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";

export default function CalendarioPage() {
  const { t, lang } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [acceduto, setAcceduto] = useState(false);
  const [token, setToken] = useState(null);
  const [errore, setErrore] = useState(null);
  const [copiato, setCopiato] = useState(false);

  async function caricaToken() {
    const { data, error } = await supabase.rpc("mio_token_calendario");
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    setToken(data);
  }

  useEffect(() => {
    async function inizia() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setCaricamento(false);
        return;
      }
      setAcceduto(true);
      await caricaToken();
      setCaricamento(false);
    }
    inizia();
  }, []);

  async function rigenera() {
    if (!window.confirm(t("cal.confermaRigenera"))) return;
    const { data, error } = await supabase.rpc("rigenera_token_calendario");
    if (error) {
      setErrore("Errore: " + error.message);
      return;
    }
    setToken(data);
  }

  if (caricamento) {
    return (
      <main>
        <p>{t("c.caricamento")}</p>
      </main>
    );
  }

  if (!acceduto) {
    return (
      <main>
        <div className="card">
          <p>{t("c.loginRichiesto")}</p>
          <p>
            <a href="/login">{t("c.vaiLogin")}</a>
          </p>
        </div>
      </main>
    );
  }

  const host = typeof window !== "undefined" ? window.location.host : "";
  const q = lang === "en" ? "?lang=en" : "";
  const link = token ? `https://${host}/api/calendario/${token}.ics${q}` : "";
  const linkWebcal = token ? `webcal://${host}/api/calendario/${token}.ics${q}` : "";

  async function copia() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch (e) {
      window.prompt(t("cal.copia"), link);
    }
  }

  return (
    <main>
      <h1>{t("cal.titolo")}</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        {t("cal.intro")}
      </p>

      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}

      {token && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2>{t("cal.apple")}</h2>
            <p>
              <a href={linkWebcal} className="btn">
                {t("cal.appleBtn")}
              </a>
            </p>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2>{t("cal.google")}</h2>
            <p>{t("cal.googleTesto")}</p>
            <p>
              <button type="button" className="btn" onClick={copia}>
                {copiato ? t("cal.copiato") : t("cal.copia")}
              </button>
            </p>
            <ul className="muted" style={{ paddingLeft: "1.2rem" }}>
              <li>
                <strong>Google Calendar</strong> {t("cal.googleHow")}
              </li>
              <li>
                <strong>Outlook</strong>{t("cal.outlookHow")}
              </li>
            </ul>
            <p className="muted" style={{ fontSize: "0.9em" }}>
              {t("cal.refresh")}
            </p>
          </div>

          <div className="card">
            <h2>{t("cal.personale")}</h2>
            <p className="muted" style={{ fontSize: "0.9em" }}>
              {t("cal.personaleTesto")}
            </p>
            <p>
              <button type="button" onClick={rigenera}>
                {t("cal.rigenera")}
              </button>
            </p>
          </div>
        </>
      )}
    </main>
  );
}
