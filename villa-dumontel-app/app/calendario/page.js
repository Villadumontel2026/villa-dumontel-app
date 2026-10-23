"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CalendarioPage() {
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
    if (!window.confirm("Il vecchio link smettera' di funzionare e dovrai rifare l'abbonamento. Continuare?")) return;
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
        <p>Caricamento...</p>
      </main>
    );
  }

  if (!acceduto) {
    return (
      <main>
        <div className="card">
          <p>Devi accedere per vedere questa pagina.</p>
          <p>
            <a href="/login">Vai al login &rarr;</a>
          </p>
        </div>
      </main>
    );
  }

  const host = typeof window !== "undefined" ? window.location.host : "";
  const link = token ? `https://${host}/api/calendario/${token}.ics` : "";
  const linkWebcal = token ? `webcal://${host}/api/calendario/${token}.ics` : "";

  async function copia() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch (e) {
      window.prompt("Copia il link:", link);
    }
  }

  return (
    <main>
      <h1>Calendario</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        Abbonati una volta sola: prenotazioni, pulizie e modifiche compaiono e si aggiornano da
        sole nel calendario del tuo telefono o del tuo computer.
      </p>

      {errore && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#a32d2d" }}>{errore}</p>
        </div>
      )}

      {token && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2>iPhone, iPad e Mac</h2>
            <p>
              <a href={linkWebcal} className="btn">
                Abbonati con Apple Calendar
              </a>
            </p>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2>Google Calendar e Outlook</h2>
            <p>Copia il link e aggiungilo come calendario da URL:</p>
            <p>
              <button type="button" className="btn" onClick={copia}>
                {copiato ? "Copiato!" : "Copia il link"}
              </button>
            </p>
            <ul className="muted" style={{ paddingLeft: "1.2rem" }}>
              <li>
                <strong>Google Calendar</strong> (da computer): Altri calendari, poi &quot;+&quot;, poi
                &quot;Da URL&quot;, incolla il link.
              </li>
              <li>
                <strong>Outlook</strong>: Aggiungi calendario, poi &quot;Sottoscrivi da Web&quot;, incolla il
                link.
              </li>
            </ul>
            <p className="muted" style={{ fontSize: "0.9em" }}>
              Google aggiorna i calendari in abbonamento ogni qualche ora, Apple pi&ugrave; spesso. Per
              avere un promemoria prima di un evento, imposta le notifiche del calendario.
            </p>
          </div>

          <div className="card">
            <h2>Link personale</h2>
            <p className="muted" style={{ fontSize: "0.9em" }}>
              Non condividerlo: chi lo ha pu&ograve; vedere i tuoi appuntamenti. Se pensi che sia
              finito in mani sbagliate, genera un nuovo link.
            </p>
            <p>
              <button type="button" onClick={rigenera}>
                Genera un nuovo link
              </button>
            </p>
          </div>
        </>
      )}
    </main>
  );
}
