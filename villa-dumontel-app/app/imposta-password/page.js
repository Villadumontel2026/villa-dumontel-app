"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";

// Scelta della password: al primo accesso con il link via email e dopo "password dimenticata"
export default function ImpostaPasswordPage() {
  const { lang } = useApp();
  const en = lang === "en";
  const [sessione, setSessione] = useState(null);
  const [pronto, setPronto] = useState(false);
  const [errore, setErrore] = useState(null);
  const [attesa, setAttesa] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessione(session);
      setPronto(true);
    });
    const { data: l } = supabase.auth.onAuthStateChange((ev, session) => {
      if (session) setSessione(session);
      setPronto(true);
    });
    return () => l.subscription.unsubscribe();
  }, []);

  async function salva(e) {
    e.preventDefault();
    setErrore(null);
    const p1 = e.target.p1.value;
    const p2 = e.target.p2.value;
    if (p1.length < 8) return setErrore(en ? "The password must have at least 8 characters." : "La password deve avere almeno 8 caratteri.");
    if (p1 !== p2) return setErrore(en ? "The two passwords are different." : "Le due password non coincidono.");
    setAttesa(true);
    const { error } = await supabase.auth.updateUser({ password: p1, data: { password_set: true } });
    setAttesa(false);
    if (error) return setErrore((en ? "Error: " : "Errore: ") + error.message);
    window.location.href = "/dopo-login";
  }

  function nonOra() {
    try {
      window.sessionStorage.setItem("vd_password_dopo", "1");
    } catch (e) {}
    window.location.href = "/dopo-login";
  }

  if (!pronto) return <main><p>…</p></main>;
  if (!sessione) {
    return (
      <main>
        <div className="card" style={{ maxWidth: 420 }}>
          <p>{en ? "This link is no longer valid. Please request a new one from the login page." : "Il link non è più valido. Chiedine uno nuovo dalla pagina di accesso."}</p>
          <p><a href="/login" className="btn">{en ? "Go to login" : "Vai all'accesso"}</a></p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>{en ? "Choose your password" : "Scegli la tua password"}</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <p className="muted">
          {en
            ? "With a password you stay logged in on this device and can sign in next time without waiting for an email."
            : "Con una password resti collegato su questo dispositivo e la prossima volta entri senza aspettare un'email."}
        </p>
        <form onSubmit={salva}>
          <label>
            {en ? "New password (min. 8 characters)" : "Nuova password (almeno 8 caratteri)"}
            <input type="password" name="p1" autoComplete="new-password" required />
          </label>
          <label>
            {en ? "Repeat the password" : "Ripeti la password"}
            <input type="password" name="p2" autoComplete="new-password" required />
          </label>
          <button type="submit" className="btn" disabled={attesa}>{en ? "Save password" : "Salva la password"}</button>
          {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
        </form>
        <p style={{ marginTop: "1rem" }}>
          <a href="#" onClick={(e) => { e.preventDefault(); nonOra(); }} className="muted">
            {en ? "Not now" : "Non ora"}
          </a>
        </p>
      </div>
    </main>
  );
}
