"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const TX = {
  it: {
    titolo: "Richiedi l'accesso",
    intro: "Compila i dati. Riceverai una email appena la tua richiesta sarà approvata.",
    nome: "Nome e cognome",
    email: "Email",
    alloggio: "Alloggio",
    a1: "Alloggio 1",
    a23: "Alloggi 2 e 3",
    nonso: "Non so / altro",
    note: "Note (facoltative)",
    invia: "Invia la richiesta",
    ok: "Richiesta inviata. Riceverai una email quando sarà approvata.",
    gia: "Abbiamo già ricevuto una richiesta con questa email: attendi l'approvazione.",
    autorizzato: "Questa email è già autorizzata: vai alla pagina di accesso.",
    errore: "Controlla i dati inseriti e riprova.",
    troppe: "Troppe richieste in questo momento: riprova più tardi.",
    vai: "Vai all'accesso",
  },
  en: {
    titolo: "Request access",
    intro: "Fill in your details. You will receive an email as soon as your request is approved.",
    nome: "Full name",
    email: "Email",
    alloggio: "Apartment",
    a1: "Apartment 1",
    a23: "Apartments 2 and 3",
    nonso: "Not sure / other",
    note: "Notes (optional)",
    invia: "Send request",
    ok: "Request sent. You will receive an email when it is approved.",
    gia: "We have already received a request with this email: please wait for approval.",
    autorizzato: "This email is already authorised: go to the login page.",
    errore: "Please check your details and try again.",
    troppe: "Too many requests right now: please try again later.",
    vai: "Go to login",
  },
  fr: {
    titolo: "Demander l'accès",
    intro: "Remplissez vos informations. Vous recevrez un e-mail dès que votre demande sera approuvée.",
    nome: "Nom et prénom",
    email: "E-mail",
    alloggio: "Logement",
    a1: "Logement 1",
    a23: "Logements 2 et 3",
    nonso: "Je ne sais pas / autre",
    note: "Remarques (facultatif)",
    invia: "Envoyer la demande",
    ok: "Demande envoyée. Vous recevrez un e-mail dès qu'elle sera approuvée.",
    gia: "Nous avons déjà reçu une demande avec cet e-mail : merci d'attendre l'approbation.",
    autorizzato: "Cet e-mail est déjà autorisé : allez à la page de connexion.",
    errore: "Vérifiez les informations saisies et réessayez.",
    troppe: "Trop de demandes en ce moment : réessayez plus tard.",
    vai: "Aller à la connexion",
  },
};

export default function AccessoPage() {
  const [lingua, setLingua] = useState("it");
  const [esito, setEsito] = useState(null);
  const [attesa, setAttesa] = useState(false);
  const t = TX[lingua];

  useEffect(() => {
    const n = (navigator.language || "it").slice(0, 2).toLowerCase();
    if (TX[n]) setLingua(n);
  }, []);

  async function invia(e) {
    e.preventDefault();
    const f = e.target;
    if (f.sito.value) return; // campo trappola per i robot
    setAttesa(true);
    const { data, error } = await supabase.rpc("richiedi_accesso", {
      p_nome: f.nome.value,
      p_email: f.email.value,
      p_lingua: lingua,
      p_alloggio: f.alloggio.value,
      p_note: f.note.value,
    });
    setAttesa(false);
    if (error) return setEsito("errore");
    setEsito(data);
    if (data === "ok") f.reset();
  }

  const msg = { ok: t.ok, gia_inviata: t.gia, gia_autorizzato: t.autorizzato, dati_non_validi: t.errore, troppe_richieste: t.troppe, errore: t.errore };

  return (
    <main>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
        {["it", "en", "fr"].map((l) => (
          <button key={l} type="button" className={lingua === l ? "btn" : "btn btn-light"} style={{ padding: "0.3rem 0.9rem" }} onClick={() => setLingua(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <h1>{t.titolo}</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="muted" style={{ marginTop: 0 }}>{t.intro}</p>
        <form onSubmit={invia}>
          <label>
            {t.nome}
            <input type="text" name="nome" required maxLength={80} autoComplete="name" />
          </label>
          <label>
            {t.email}
            <input type="email" name="email" required maxLength={120} autoComplete="email" />
          </label>
          <label>
            {t.alloggio}
            <select name="alloggio" defaultValue="">
              <option value="">{t.nonso}</option>
              <option value="Alloggio 1">{t.a1}</option>
              <option value="Alloggi 2 e 3">{t.a23}</option>
            </select>
          </label>
          <label>
            {t.note}
            <textarea name="note" maxLength={300} rows={3}></textarea>
          </label>
          <input type="text" name="sito" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} aria-hidden="true" />
          <button type="submit" className="btn" disabled={attesa}>
            {t.invia}
          </button>
        </form>
        {esito && (
          <p style={{ marginTop: "1rem", color: esito === "ok" ? "#2f4739" : "#a32d2d" }}>
            {msg[esito] || t.errore}
          </p>
        )}
        {esito === "gia_autorizzato" && (
          <p>
            <a href="/login" className="btn btn-light">{t.vai}</a>
          </p>
        )}
      </div>
    </main>
  );
}
