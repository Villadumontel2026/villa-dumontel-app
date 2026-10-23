"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
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
      setErrore("Email o password non corrette.");
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
      <h1>Accedi</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: "1rem" }}>
          <button type="button" style={tab(modo === "password")} onClick={() => { setModo("password"); setErrore(null); setInviato(false); }}>
            Password
          </button>
          <button type="button" style={tab(modo === "link")} onClick={() => { setModo("link"); setErrore(null); }}>
            Link per email
          </button>
        </div>

        {modo === "password" && (
          <form onSubmit={accediConPassword}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <button type="submit" className="btn" disabled={attesa}>
              Accedi
            </button>
            {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
            <p className="muted" style={{ fontSize: "0.9em" }}>
              Non hai ancora una password? Usa &quot;Link per email&quot;; una volta dentro potrai impostarla da Account.
            </p>
          </form>
        )}

        {modo === "link" &&
          (inviato ? (
            <p>Controlla la tua email: ti abbiamo inviato un link per accedere.</p>
          ) : (
            <form onSubmit={inviaLink}>
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <button type="submit" className="btn" disabled={attesa}>
                Invia link di accesso
              </button>
              {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
            </form>
          ))}
      </div>
    </main>
  );
}
