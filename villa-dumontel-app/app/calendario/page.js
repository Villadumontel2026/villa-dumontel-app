"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import CalendarioVista from "../components/CalendarioVista";
import { applicaVista } from "../../lib/vista";
import { espandiEventi, coloreEvento } from "../../lib/eventi";

export default function CalendarioPage() {
  const { t, lang } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [acceduto, setAcceduto] = useState(false);
  const [token, setToken] = useState(null);
  const [errore, setErrore] = useState(null);
  const [copiato, setCopiato] = useState(false);
  const [famigliaId, setFamigliaId] = useState(null);
  const [mie, setMie] = useState([]);
  const [eventiCal, setEventiCal] = useState([]);
  const [sonoAdmin, setSonoAdmin] = useState(false);
  const [tutteRichieste, setTutteRichieste] = useState([]);

  async function caricaMie(fid) {
    const { data } = await supabase
      .from("richieste")
      .select("*")
      .eq("famiglia_id", fid)
      .neq("stato", "annullata")
      .order("data", { ascending: true });
    setMie(data || []);
    const { data: evs } = await supabase.from("eventi").select("*").order("data_inizio", { ascending: true }).limit(500);
    setEventiCal(evs || []);
  }

  async function caricaAdmin() {
    const { data } = await supabase
      .from("richieste")
      .select("*, alloggi(nome), famiglie(nome)")
      .neq("stato", "annullata")
      .order("data", { ascending: true });
    setTutteRichieste((data || []).filter((r) => r.data));
    const { data: evs } = await supabase.from("eventi").select("*").order("data_inizio", { ascending: true }).limit(1000);
    setEventiCal(evs || []);
  }

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
      const { data: pRaw } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();
      const p = applicaVista(pRaw);
      const admin = pRaw?.ruolo === "admin" && p?.ruolo === "admin";
      setSonoAdmin(admin);
      if (admin) await caricaAdmin();
      if (p && p.ruolo === "ospite" && p.famiglia_id) {
        setFamigliaId(p.famiglia_id);
        await caricaMie(p.famiglia_id);
      }
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
            <a href="/login" className="btn">
              {t("c.vaiLogin")}
            </a>
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

      {sonoAdmin && (
        <p style={{ marginBottom: "1.5rem" }}>
          <a href="/calendario/evento" className="btn">
            Aggiungi un evento
          </a>
        </p>
      )}

      {sonoAdmin && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <CalendarioVista
            eventi={[...tutteRichieste, ...espandiEventi(eventiCal, lang)]}
            colore={(r) => (r.tipo === "evento" ? coloreEvento(r) : ["#2f4739", "#2b6a9e", "#a2562c", "#7a4b94"][(r.famiglia_id || 0) % 4])}
            amministratore
            onCambiato={caricaAdmin}
          />
        </div>
      )}

      {famigliaId && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>{t("cal.mioTitolo")}</h2>
          <CalendarioVista
            eventi={[...mie, ...espandiEventi(eventiCal, lang)]}
            colore={(r) => (r.tipo === "evento" ? coloreEvento(r) : "#2f4739")}
            onCambiato={() => caricaMie(famigliaId)}
          />
        </div>
      )}

      <h2>{t("cal.abbonamento")}</h2>
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
