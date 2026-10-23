"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AccountPage() {
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
      setErrore("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (p1 !== p2) {
      setErrore("Le due password non coincidono.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) {
      setErrore(error.message);
    } else {
      setMessaggio("Password salvata. Da ora puoi accedere anche con email e password.");
      f.reset();
    }
  }

  if (caricamento) {
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  }

  if (!email) {
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

  return (
    <main>
      <h1>Il mio account</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <p className="muted">Collegato come {email}</p>
        <h2>Imposta una password</h2>
        <p className="muted">
          Cos&igrave; puoi entrare senza aspettare il link per email.
        </p>
        <form onSubmit={salva}>
          <label>
            Nuova password
            <input type="password" name="password" autoComplete="new-password" required />
          </label>
          <label>
            Ripeti la password
            <input type="password" name="conferma" autoComplete="new-password" required />
          </label>
          <button type="submit" className="btn">
            Salva password
          </button>
          {messaggio && <p style={{ color: "#1f5c2e" }}>{messaggio}</p>}
          {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
        </form>
      </div>
    </main>
  );
}
