"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { impostaVista, leggiVista } from "../../lib/vista";
import { attivaPush, disattivaPush, eIphoneNonInstallato, pushSupportato, statoPush } from "../../lib/push";

export default function AccountPage() {
  const { t, lang, setLang, ruoloReale, ruolo } = useApp();
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefCal, setPrefCal] = useState(null);
  const [prefMsg, setPrefMsg] = useState(null);
  const [push, setPush] = useState("carico");
  const [pushErr, setPushErr] = useState(null);
  const [pushProva, setPushProva] = useState(null);

  async function provaPush() {
    setPushProva(lang === "en" ? "Sending..." : "Invio...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    try {
      const res = await fetch("/api/push/prova", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.access_token },
      });
      const j = await res.json();
      if (!res.ok) return setPushProva(j.errore || "Errore " + res.status);
      setPushProva(
        j.esiti
          .map((e) => (e.ok ? (lang === "en" ? "Sent (" : "Inviata (") + e.status + ")" : "Errore " + e.status + (e.errore ? ": " + e.errore : "")))
          .join(" | ")
      );
    } catch (e) {
      setPushProva(e.message);
    }
  }

  useEffect(() => {
    statoPush().then(setPush);
  }, []);

  async function cambiaPush(attiva) {
    setPushErr(null);
    try {
      if (attiva) await attivaPush();
      else await disattivaPush();
    } catch (e) {
      setPushErr(e.message);
    }
    setPush(await statoPush());
  }
  const [famiglie, setFamiglie] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [provaMsg, setProvaMsg] = useState(null);
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

  // preferenze di notifica
  useEffect(() => {
    async function leggi() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("preferenze_notifiche")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) {
        if (data.email_attive !== null) setPrefEmail(data.email_attive);
        if (data.calendario) setPrefCal(data.calendario);
      }
    }
    leggi();
  }, []);

  const calEffettivo = prefCal || (ruolo === "ospite" ? "invito" : "nessuno");

  async function salvaPreferenze(e) {
    e.preventDefault();
    setPrefMsg(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("preferenze_notifiche").upsert(
      {
        user_id: session.user.id,
        email_attive: prefEmail,
        calendario: calEffettivo,
        lingua: lang,
        aggiornato_il: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setPrefMsg(error ? error.message : t("acc.prefSalvate"));
  }

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

  async function cancellaProva() {
    if (
      !window.confirm(
        "Cancellare tutte le richieste, gli avvisi, i turni e i conti della famiglia, alloggio e collaboratrice PROVA? I dati reali non vengono toccati."
      )
    )
      return;
    setProvaMsg(null);
    const { data, error } = await supabase.rpc("cancella_dati_prova");
    if (error) {
      setProvaMsg("Errore: " + error.message);
      return;
    }
    setProvaMsg(
      `Fatto. Cancellati: ${data.richieste} richieste, ${data.avvisi} avvisi, ${data.turni} turni, ${data.versamenti} versamenti, ${data.spese} spese.`
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

      <div className="card" style={{ maxWidth: 420, marginTop: "1.5rem" }}>
        <h2>{t("acc.notifiche")}</h2>
        <p className="muted">{t("acc.notificheTesto")}</p>
        <form onSubmit={salvaPreferenze}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={prefEmail}
              onChange={(e) => setPrefEmail(e.target.checked)}
              style={{ width: "auto", marginBottom: 0 }}
            />
            {t("acc.emailAvvisi")}
          </label>
          <p style={{ marginBottom: "0.25rem", fontWeight: 600 }}>{t("acc.calendario")}</p>
          {[
            ["invito", "acc.calInvito"],
            ["abbonamento", "acc.calAbbonamento"],
            ["nessuno", "acc.calNessuno"],
          ].map(([v, k]) => (
            <label key={v} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontWeight: 400 }}>
              <input
                type="radio"
                name="calendario"
                checked={calEffettivo === v}
                onChange={() => setPrefCal(v)}
                style={{ width: "auto", marginBottom: 0, marginTop: "0.25rem" }}
              />
              {t(k)}
            </label>
          ))}
          <p className="muted" style={{ fontSize: "0.85em" }}>
            {t("acc.calAvviso")}
          </p>
          <button type="submit" className="btn">
            {t("acc.salvaPref")}
          </button>
          {prefMsg && <p style={{ color: "#1f5c2e" }}>{prefMsg}</p>}
        </form>
      </div>

      <div className="card" style={{ maxWidth: 420, marginTop: "1.5rem" }}>
        <h2>{lang === "en" ? "Phone notifications" : "Notifiche sul telefono"}</h2>
        <p className="muted">
          {lang === "en"
            ? "Get a notification on this device when something changes, even when the app is closed."
            : "Ricevi una notifica su questo dispositivo quando cambia qualcosa, anche con l'app chiusa."}
        </p>
        {push === "non-supportato" && (
          <p className="muted">
            {eIphoneNonInstallato()
              ? lang === "en"
                ? "On iPhone: open the app in Safari, tap Share > Add to Home Screen, then open it from the home screen and come back here."
                : "Su iPhone: apri l'app con Safari, tocca Condividi > Aggiungi alla schermata Home, poi aprila dalla Home e torna qui."
              : lang === "en"
              ? "This browser does not support notifications."
              : "Questo browser non supporta le notifiche."}
          </p>
        )}
        {push === "bloccato" && (
          <p className="muted">
            {lang === "en"
              ? "Notifications are blocked for this site. Enable them in your browser or phone settings."
              : "Le notifiche sono bloccate per questo sito. Attivale dalle impostazioni del browser o del telefono."}
          </p>
        )}
        {push === "spento" && (
          <button type="button" className="btn" onClick={() => cambiaPush(true)}>
            {lang === "en" ? "Turn on on this device" : "Attiva su questo dispositivo"}
          </button>
        )}
        {push === "attivo" && (
          <>
            <p style={{ color: "#1f5c2e" }}>{lang === "en" ? "Active on this device." : "Attive su questo dispositivo."}</p>
            <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={provaPush}>
                {lang === "en" ? "Send a test notification" : "Invia notifica di prova"}
              </button>
              <button type="button" className="btn btn-light" onClick={() => cambiaPush(false)}>
                {lang === "en" ? "Turn off" : "Disattiva"}
              </button>
            </p>
            {pushProva && <p className="muted">{pushProva}</p>}
          </>
        )}
        {pushErr && <p style={{ color: "#a32d2d" }}>{pushErr}</p>}
      </div>

      {ruoloReale === "admin" && ruolo === "admin" && (
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
                  window.location.href = "/collaboratore";
                }}
              >
                {c.nome}
              </button>
            ))}
          </p>
        </div>
      )}

      {ruoloReale === "admin" && ruolo === "admin" && (
        <div className="card" style={{ maxWidth: 420, marginTop: "1.5rem" }}>
          <h2>Promemoria automatici</h2>
          <p className="muted">Scegli quali promemoria inviare per ristoranti, attivit&agrave;, trasporti e pulizie.</p>
          <p>
            <a href="/impostazioni/promemoria" className="btn">
              Gestisci promemoria automatici
            </a>
          </p>
        </div>
      )}

      {ruoloReale === "admin" && ruolo === "admin" && (
        <div className="card" style={{ maxWidth: 420, marginTop: "1.5rem" }}>
          <h2>Ambiente di prova</h2>
          <p className="muted">
            Per provare l&apos;app usa la <strong>Famiglia PROVA</strong> e la <strong>Collaboratrice PROVA</strong>{" "}
            (con &quot;Vedi l&apos;app come...&quot;). Quando hai finito, questo pulsante cancella tutto ci&ograve; che le
            riguarda, senza toccare i dati reali.
          </p>
          <button type="button" className="btn" onClick={cancellaProva}>
            Cancella dati di prova
          </button>
          {provaMsg && <p style={{ marginTop: "0.75rem" }}>{provaMsg}</p>}
        </div>
      )}
    </main>
  );
}
