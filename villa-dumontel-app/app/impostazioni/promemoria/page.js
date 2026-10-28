"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const TIPI = [
  ["ristorante_pranzo", "Ristorante: pranzo"],
  ["ristorante_cena", "Ristorante: cena"],
  ["attivita", "Attività"],
  ["trasporto", "Trasporti"],
  ["pulizie", "Pulizie"],
];
const DESTINATARI = [
  ["famiglia", "Ospite"],
  ["collaboratore", "Collaboratrice"],
  ["admin", "Admin"],
];
const UNITA = [
  ["m", "minuti", 1],
  ["h", "ore", 60],
  ["g", "giorni", 1440],
];

// 1440 -> {n:1, u:"g"}, 120 -> {n:2, u:"h"}
function scomponi(min) {
  if (min % 1440 === 0) return { n: min / 1440, u: "g" };
  if (min % 60 === 0) return { n: min / 60, u: "h" };
  return { n: min, u: "m" };
}
const moltiplicatore = (u) => UNITA.find((x) => x[0] === u)[2];

export default function PromemoriaPage() {
  const [stato, setStato] = useState("carico");
  const [regole, setRegole] = useState([]);
  const [msg, setMsg] = useState(null);

  async function carica() {
    const { data, error } = await supabase
      .from("regole_promemoria")
      .select("*")
      .order("anticipo_minuti", { ascending: false });
    if (error) {
      setMsg("Errore: " + error.message);
      return;
    }
    setRegole(data || []);
  }

  useEffect(() => {
    async function inizio() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setStato("login");
      const { data: p } = await supabase.from("profili").select("ruolo").eq("id", session.user.id).single();
      if (p?.ruolo !== "admin") return setStato("no");
      await carica();
      setStato("ok");
    }
    inizio();
  }, []);

  async function aggiorna(id, campi) {
    setMsg(null);
    const { error } = await supabase.from("regole_promemoria").update(campi).eq("id", id);
    if (error) return setMsg("Errore: " + error.message);
    await carica();
  }

  async function aggiungi(tipo) {
    setMsg(null);
    const { error } = await supabase
      .from("regole_promemoria")
      .insert({ tipo, destinatario: "famiglia", anticipo_minuti: 1440 });
    if (error) return setMsg("Errore: " + error.message);
    await carica();
  }

  async function elimina(id) {
    if (!window.confirm("Eliminare questo promemoria?")) return;
    const { error } = await supabase.from("regole_promemoria").delete().eq("id", id);
    if (error) return setMsg("Errore: " + error.message);
    await carica();
  }

  if (stato === "carico")
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  if (stato !== "ok")
    return (
      <main>
        <div className="card">
          <p>{stato === "login" ? "Devi accedere." : "Pagina riservata all'amministratore."}</p>
          <p>
            <a href="/login" className="btn">
              Vai al login
            </a>
          </p>
        </div>
      </main>
    );

  return (
    <main>
      <h1>Promemoria</h1>
      <p className="muted">
        Per ogni tipo di richiesta scegli chi riceve un promemoria e quanto tempo prima dell&apos;evento. Valgono solo per le
        richieste confermate. Per ogni promemoria puoi scegliere uno o pi&ugrave; canali: avviso nell&apos;app e/o email (la mail rispetta la preferenza di
        ciascun utente). La notifica push sul telefono arriver&agrave; in una fase successiva.
      </p>
      {msg && <p style={{ color: "#a33" }}>{msg}</p>}

      {TIPI.map(([tipo, titolo]) => (
        <div key={tipo} className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>{titolo}</h2>
          {regole.filter((r) => r.tipo === tipo).length === 0 && <p className="muted">Nessun promemoria.</p>}
          {regole
            .filter((r) => r.tipo === tipo)
            .map((r) => {
              const { n, u } = scomponi(r.anticipo_minuti);
              return (
                <div
                  key={r.id}
                  className="richiesta-item"
                  style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center", opacity: r.attivo ? 1 : 0.5 }}
                >
                  <select
                    value={r.destinatario}
                    onChange={(e) => aggiorna(r.id, { destinatario: e.target.value })}
                    style={{ width: "auto", marginBottom: 0 }}
                  >
                    {DESTINATARI.filter(([v]) => v !== "collaboratore" || tipo === "pulizie").map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    defaultValue={n}
                    key={r.id + "-" + r.anticipo_minuti}
                    style={{ width: "5rem", marginBottom: 0 }}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (v > 0 && v * moltiplicatore(u) !== r.anticipo_minuti) {
                        aggiorna(r.id, { anticipo_minuti: v * moltiplicatore(u) });
                      }
                    }}
                  />
                  <select
                    value={u}
                    onChange={(e) => aggiorna(r.id, { anticipo_minuti: n * moltiplicatore(e.target.value) })}
                    style={{ width: "auto", marginBottom: 0 }}
                  >
                    {UNITA.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <span className="muted">prima</span>
                  <label style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={r.canale_app}
                      onChange={(e) => aggiorna(r.id, { canale_app: e.target.checked })}
                      style={{ width: "auto", marginBottom: 0 }}
                    />
                    App
                  </label>
                  <label style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={r.canale_email}
                      onChange={(e) => aggiorna(r.id, { canale_email: e.target.checked })}
                      style={{ width: "auto", marginBottom: 0 }}
                    />
                    Email
                  </label>
                  <label
                    style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center", opacity: 0.6 }}
                    title="In arrivo"
                  >
                    <input type="checkbox" disabled style={{ width: "auto", marginBottom: 0 }} />
                    Push (in arrivo)
                  </label>
                  <label style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={r.attivo}
                      onChange={(e) => aggiorna(r.id, { attivo: e.target.checked })}
                      style={{ width: "auto", marginBottom: 0 }}
                    />
                    Attivo
                  </label>
                  <button type="button" className="btn btn-light" style={{ padding: "0.25rem 0.7rem" }} onClick={() => elimina(r.id)}>
                    Elimina
                  </button>
                </div>
              );
            })}
          <p style={{ margin: "0.75rem 0 0" }}>
            <button type="button" className="btn btn-light" onClick={() => aggiungi(tipo)}>
              + Aggiungi promemoria
            </button>
          </p>
        </div>
      ))}
    </main>
  );
}
