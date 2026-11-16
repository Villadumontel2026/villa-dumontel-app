"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";

export default function LoginPage() {
  const { t, lang } = useApp();
  const [modo, setModo] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviato, setInviato] = useState(false);
  const [errore, setErrore] = useState(null);
  const [attesa, setAttesa] = useState(false);
  const en = lang === "en";

  async function richiediReset(e) {
    e.preventDefault();
    setErrore(null);
    setAttesa(true);
    const { error } = await supabase.rpc("richiedi_reset_password", { p_email: email });
    setAttesa(false);
    if (error) setErrore(error.message);
    else setInviato(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/dopo-login";
    });
  }, []);

  async function accediConPassword(e) {
    e.preventDefault();
    setErrore(null);
    setAttesa(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAttesa(false);
    if (error) {
      setErrore(t("login.errore"));
    } else {
      window.location.href = "/dopo-login";
    }
  }

  async function inviaLink(e) {
    e.preventDefault();
    setErrore(null);
    setAttesa(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dopo-login`,
      },
    });
    setAttesa(false);
    if (error) {
      setErrore(error.message);
    } else {
      setInviato(true);
    }
  }

  const tab = (attivo) => ({
    background: "none",
    border: "none",
    borderBottom: attivo ? "2px solid #2f4739" : "2px solid transparent",
    padding: "0.4rem 0.2rem",
    marginRight: "1rem",
    fontWeight: attivo ? 600 : 400,
    cursor: "pointer",
    color: "inherit",
  });

  return (
    <main>
      <h1>{t("login.titolo")}</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: "1rem" }}>
          <button type="button" style={tab(modo === "password")} onClick={() => { setModo("password"); setErrore(null); setInviato(false); }}>
            {t("login.tabPassword")}
          </button>
          <button type="button" style={tab(modo === "link")} onClick={() => { setModo("link"); setErrore(null); }}>
            {t("login.tabLink")}
          </button>
        </div>

        {modo === "password" && (
          <form onSubmit={accediConPassword}>
            <label>
              {t("login.email")}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            </label>
            <label>
              {t("login.password")}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <button type="submit" className="btn" disabled={attesa}>
              {t("login.accedi")}
            </button>
            {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
            <p className="muted" style={{ fontSize: "0.9em" }}>
              {t("login.hint")}
            </p>
            <p style={{ fontSize: "0.9em" }}>
              <a href="#" onClick={(ev) => { ev.preventDefault(); setModo("dimenticata"); setErrore(null); setInviato(false); }}>
                {en ? "Forgot your password?" : "Password dimenticata?"}
              </a>
            </p>
          </form>
        )}

        {modo === "dimenticata" &&
          (inviato ? (
            <p>
              {en
                ? "Thank you. We have notified the administrator: you will receive an email with a link to choose a new password."
                : "Grazie. Abbiamo avvisato l'amministratore: riceverai un'email con il link per scegliere una nuova password."}
            </p>
          ) : (
            <form onSubmit={richiediReset}>
              <p className="muted" style={{ marginTop: 0 }}>
                {en ? "Enter your email: we will ask the administrator to send you a link." : "Inserisci la tua email: chiederemo all'amministratore di mandarti un link."}
              </p>
              <label>
                {t("login.email")}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <button type="submit" className="btn" disabled={attesa}>
                {en ? "Request a new password" : "Richiedi una nuova password"}
              </button>
              {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
            </form>
          ))}

        {modo === "link" &&
          (inviato ? (
            <p>{t("login.inviato")}</p>
          ) : (
            <form onSubmit={inviaLink}>
              <label>
                {t("login.email")}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <button type="submit" className="btn" disabled={attesa}>
                {t("login.inviaLink")}
              </button>
              {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
            </form>
          ))}
      </div>
    </main>
  );
}
