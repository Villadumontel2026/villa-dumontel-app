"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useApp } from "../../components/AppProvider";

const GUESS = { "Alloggio 1": "Karen", "Alloggi 2 e 3": "Judith" };

export default function AccessiAdminPage() {
  const { ruolo, pronto } = useApp();
  const [righe, setRighe] = useState([]);
  const [famiglie, setFamiglie] = useState([]);
  const [errore, setErrore] = useState(null);
  const [msg, setMsg] = useState(null);

  async function carica() {
    const { data } = await supabase.from("richieste_accesso").select("*").order("creata_il", { ascending: false }).limit(100);
    setRighe(data || []);
    const { data: fam } = await supabase.from("famiglie").select("id, nome, test").order("id");
    setFamiglie((fam || []).filter((f) => !f.test));
  }

  useEffect(() => {
    if (pronto && ruolo === "admin") carica();
  }, [pronto, ruolo]);

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session ? data.session.access_token : null;
  }

  async function approva(e, r) {
    e.preventDefault();
    setErrore(null);
    setMsg(null);
    const famId = e.target.famiglia.value;
    if (!famId) return setErrore("Scegli la famiglia.");
    const { error } = await supabase.rpc("approva_accesso", { p_id: r.id, p_famiglia_id: parseInt(famId, 10) });
    if (error) return setErrore("Errore: " + error.message);
    const res = await fetch("/api/accesso/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) },
      body: JSON.stringify({ id: r.id }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Approvata. Email inviata a " + r.email + "." : "Approvata, ma l'email non è partita: " + (j.errore || res.status));
    await carica();
  }

  async function rifiuta(r) {
    if (!window.confirm("Rifiutare la richiesta di " + r.nome + "?")) return;
    const { error } = await supabase.rpc("rifiuta_accesso", { p_id: r.id });
    if (error) return setErrore("Errore: " + error.message);
    await carica();
  }

  if (pronto && ruolo !== "admin") {
    return (
      <main>
        <div className="card"><p>Questa pagina è riservata all&apos;amministratore.</p></div>
      </main>
    );
  }

  const inAttesa = righe.filter((r) => r.stato === "in attesa");
  const altre = righe.filter((r) => r.stato !== "in attesa");
  const nomeFam = (id) => (famiglie.find((f) => f.id === id) || {}).nome || "";
  const suggerita = (r) => {
    const k = GUESS[r.alloggio_indicato];
    const f = k && famiglie.find((x) => String(x.nome).includes(k));
    return f ? f.id : "";
  };

  return (
    <main>
      <h1>Richieste di accesso</h1>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}
      {msg && <p style={{ color: "#2f4739" }}>{msg}</p>}

      <h2>Da approvare ({inAttesa.length})</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {inAttesa.length === 0 && <p className="muted">Nessuna richiesta in attesa.</p>}
        {inAttesa.map((r) => (
          <div key={r.id} className="richiesta-item">
            <strong>{r.nome}</strong> &mdash; {r.email}
            <p className="descrizione" style={{ margin: "0.15rem 0" }}>
              Lingua {String(r.lingua).toUpperCase()}
              {r.alloggio_indicato ? ` · ${r.alloggio_indicato}` : ""}
              {r.note ? ` — ${r.note}` : ""}
            </p>
            <form onSubmit={(e) => approva(e, r)} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <select name="famiglia" defaultValue={suggerita(r)} style={{ width: "auto", marginBottom: 0 }}>
                <option value="">— famiglia —</option>
                {famiglie.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              <button type="submit" className="btn">Approva e invia email</button>
              <button type="button" className="btn btn-light" onClick={() => rifiuta(r)}>Rifiuta</button>
            </form>
          </div>
        ))}
      </div>

      {altre.length > 0 && (
        <details className="card">
          <summary style={{ cursor: "pointer" }}>Gestite ({altre.length})</summary>
          {altre.map((r) => (
            <div key={r.id} className="richiesta-item">
              <strong>{r.nome}</strong> &mdash; {r.email}
              <p className="descrizione" style={{ margin: "0.15rem 0" }}>
                {r.stato}
                {r.famiglia_id ? ` · ${nomeFam(r.famiglia_id)}` : ""}
              </p>
            </div>
          ))}
        </details>
      )}
    </main>
  );
}
