"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

// Eventi che generano una notifica, raggruppati per destinatario
const GRUPPI = [
  [
    "admin",
    "A te e agli altri amministratori",
    [
      ["nuova_richiesta", "Un ospite fa una nuova richiesta"],
      ["ospite_modifica", "Un ospite modifica una richiesta"],
      ["ospite_annulla", "Un ospite annulla una richiesta"],
      ["proposta_risposta", "Un ospite risponde a una proposta di modifica"],
      ["pulizia_accettata", "La collaboratrice accetta una pulizia"],
      ["pulizia_fatta", "La collaboratrice segna una pulizia come fatta (da validare)"],
    ],
  ],
  [
    "famiglia",
    "Agli ospiti",
    [
      ["richiesta_confermata", "La richiesta viene confermata"],
      ["richiesta_modificata", "La richiesta viene modificata"],
      ["richiesta_annullata", "La richiesta viene annullata"],
      ["proposta_modifica", "Ricevono una proposta di modifica"],
      ["pulizia_accettata", "La collaboratrice accetta la pulizia"],
      ["evento_nuovo", "Nuovo evento nel calendario (se spunti \"Avvisa subito\")"],
      ["evento_modificato", "Un evento viene modificato"],
      ["evento_annullato", "Un evento viene eliminato"],
    ],
  ],
  [
    "collaboratore",
    "Alla collaboratrice",
    [
      ["pulizia_assegnata", "Le viene assegnata una nuova pulizia"],
      ["pulizia_modificata", "Una sua pulizia viene modificata o annullata"],
      ["evento_nuovo", "Nuovo evento nel calendario (se spunti \"Avvisa subito\")"],
      ["evento_modificato", "Un evento viene modificato"],
      ["evento_annullato", "Un evento viene eliminato"],
    ],
  ],
];

export default function NotifichePage() {
  const [stato, setStato] = useState("carico");
  const [regole, setRegole] = useState([]);
  const [msg, setMsg] = useState(null);

  async function carica() {
    const { data, error } = await supabase.from("regole_notifiche").select("*");
    if (error) return setMsg("Errore: " + error.message);
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

  async function cambia(evento, destinatario, campo, valore) {
    setMsg(null);
    const { error } = await supabase
      .from("regole_notifiche")
      .update({ [campo]: valore })
      .eq("evento", evento)
      .eq("destinatario", destinatario);
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

  const get = (e, d) => regole.find((r) => r.evento === e && r.destinatario === d);

  return (
    <main>
      <h1>Notifiche per evento</h1>
      <p className="muted">
        Per ogni evento scegli come avvisare ciascun destinatario: <strong>App</strong> (avviso nella Home),{" "}
        <strong>Email</strong> e <strong>Push</strong> (sul telefono, solo per chi le ha attivate). Un utente pu&ograve;
        comunque spegnere le email dal proprio Account.
      </p>
      <p className="muted">
        Attenzione: l&apos;invito al calendario degli ospiti viaggia con la <strong>email</strong> di conferma, modifica o
        annullamento della richiesta. Se spegni quelle email, l&apos;invito non parte.
      </p>
      <p>
        <a href="/impostazioni/promemoria" className="btn btn-light">
          Promemoria automatici &rarr;
        </a>
      </p>
      {msg && <p style={{ color: "#a33" }}>{msg}</p>}

      {GRUPPI.map(([dest, titolo, eventi]) => (
        <div key={dest} className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>{titolo}</h2>
          {eventi.map(([ev, etichetta]) => {
            const r = get(ev, dest);
            if (!r) return null;
            return (
              <div
                key={ev}
                className="richiesta-item"
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}
              >
                <span style={{ flex: "1 1 14rem" }}>{etichetta}</span>
                <span style={{ display: "flex", gap: "0.9rem" }}>
                  {[
                    ["canale_app", "App"],
                    ["canale_email", "Email"],
                    ["canale_push", "Push"],
                  ].map(([campo, nome]) => (
                    <label key={campo} style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={r[campo]}
                        onChange={(e) => cambia(ev, dest, campo, e.target.checked)}
                        style={{ width: "auto", marginBottom: 0 }}
                      />
                      {nome}
                    </label>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </main>
  );
}
