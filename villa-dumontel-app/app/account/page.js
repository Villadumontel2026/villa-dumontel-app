"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";

export default function AccountPage() {
  const { t, lang, setLang } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [email, setEmail] = useState(null);
  const [messaggio, setMessaggio] = useState(null);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session ? session.user.email : null);
      setCaricamento(false);
    });
  }, []);

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    setMessaggio(null);
    const f = e.target;
    const p1 = f.password.value;
    const p2 = f.conferma.value;
    if (p1.length < 8) {
      setErrore(t("acc.corta"));
      return;
    }
    if (p1 !== p2) {
      setErrore(t("acc.diverse"));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) {
      setErrore(error.message);
    } else {
      setMessaggio(t("acc.ok"));
      f.reset();
    }
  }

  if (caricamento) {
    return (
      <main>
        <p>{t("c.caricamento")}</p>
      </main>
    );
  }

  if (!email) {
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

  return (
    <main>
      <h1>{t("acc.titolo")}</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <p className="muted">{t("acc.collegato")} {email}</p>
        <h2>{t("acc.imposta")}</h2>
        <p className="muted">{t("acc.perche")}</p>
        <form onSubmit={salva}>
          <label>
            {t("acc.nuova")}
            <input type="password" name="password" autoComplete="new-password" required />
          </label>
          <label>
            {t("acc.ripeti")}
            <input type="password" name="conferma" autoComplete="new-password" required />
          </label>
          <button type="submit" className="btn">
            {t("acc.salva")}
          </button>
          {messaggio && <p style={{ color: "#1f5c2e" }}>{messaggio}</p>}
          {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
        </form>
      </div>

      <div className="card" style={{ maxWidth: 420, marginTop: "1.5rem" }}>
        <h2>{t("acc.lingua")}</h2>
        <p style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className={lang === "it" ? "btn" : ""} onClick={() => setLang("it")}>
            Italiano
          </button>
          <button type="button" className={lang === "en" ? "btn" : ""} onClick={() => setLang("en")}>
            English
          </button>
        </p>
      </div>
    </main>
  );
}
