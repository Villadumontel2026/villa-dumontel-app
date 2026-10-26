"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { impostaVista, leggiVista } from "../../lib/vista";

export default function AccountPage() {
  const { t, lang, setLang, ruoloReale } = useApp();
  const [famiglie, setFamiglie] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
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

  useEffect(() => {
    if (ruoloReale !== "admin") return;
    supabase.from("famiglie").select("id, nome").order("id").then(({ data }) => setFamiglie(data || []));
    supabase.from("collaboratori").select("id, nome").order("id").then(({ data }) => setCollaboratori(data || []));
  }, [ruoloReale]);

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

      {ruoloReale === "admin" && (
        <div className="card" style={{ maxWidth: 420, marginTop: "1.5rem" }}>
          <h2>Vedi l&apos;app come...</h2>
          <p className="muted">
            Apri l&apos;app come la vede un ospite o una collaboratrice, per controllare pagine e lingua.
            Attenzione: le azioni (prenotare, annullare, confermare) sono reali. Per tornare admin usa il
            banner arancione in alto.
          </p>
          <p className="muted" style={{ marginBottom: "0.25rem" }}>
            Ospite
          </p>
          <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: 0 }}>
            {famiglie.map((f) => (
              <button
                key={f.id}
                type="button"
                className="btn"
                onClick={() => {
                  impostaVista("ospite", f);
                  window.location.href = "/ospite";
                }}
              >
                {f.nome}
              </button>
            ))}
          </p>
          <p className="muted" style={{ marginBottom: "0.25rem" }}>
            Collaboratrice
          </p>
          <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: 0 }}>
            {collaboratori.map((c) => (
              <button
                key={c.id}
                type="button"
                className="btn"
                onClick={() => {
                  impostaVista("collaboratore", c);
                  window.location.href = "/pulizie/collaboratore";
                }}
              >
                {c.nome}
              </button>
            ))}
          </p>
        </div>
      )}
    </main>
  );
}
