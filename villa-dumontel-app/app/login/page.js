"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [inviato, setInviato] = useState(false);
  const [errore, setErrore] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrore(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dopo-login`,
      },
    });

    if (error) {
      setErrore(error.message);
    } else {
      setInviato(true);
    }
  }

  return (
    <main>
      <h1>Accedi</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        {inviato ? (
          <p>
            Controlla la tua email: ti abbiamo inviato un link per accedere.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn">
              Invia link di accesso
            </button>
            {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
