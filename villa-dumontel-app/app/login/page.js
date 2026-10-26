"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";

export default function LoginPage() {
  const { t } = useApp();
  const [modo, setModo] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviato, setInviato] = useState(false);
  const [errore, setErrore] = useState(null);
  const [attesa, setAttesa] = useState(false);

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
          </form>
        )}

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
