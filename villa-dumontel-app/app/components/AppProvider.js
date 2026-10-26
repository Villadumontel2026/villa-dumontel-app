"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { LINGUE, tradurre } from "../../lib/i18n";
import { leggiVista } from "../../lib/vista";

const Ctx = createContext({
  lang: "it",
  setLang: () => {},
  t: (k) => k,
  pronto: false,
  email: null,
  ruolo: null,
});

const CHIAVE = "vd_lang";

// Fornisce a tutta l'app: lingua, funzione di traduzione t(), sessione (email, ruolo).
// Lingua iniziale: scelta salvata > ospite = inglese, admin/collaboratrici = italiano >
// lingua del browser (visitatori).
export function AppProvider({ children }) {
  const [lang, setLangState] = useState("it");
  const [scelta, setScelta] = useState(false); // true se l'utente ha scelto a mano
  const [pronto, setPronto] = useState(false);
  const [email, setEmail] = useState(null);
  const [ruolo, setRuolo] = useState(null);

  // lingua salvata o del browser
  useEffect(() => {
    let salvata = null;
    try {
      salvata = window.localStorage.getItem(CHIAVE);
    } catch (e) {}
    if (salvata && LINGUE.includes(salvata)) {
      setLangState(salvata);
      setScelta(true);
    } else {
      const b = (navigator.language || "it").slice(0, 2).toLowerCase();
      setLangState(LINGUE.includes(b) ? b : "en");
    }
  }, []);

  // sessione e ruolo
  useEffect(() => {
    let attivo = true;
    async function aggiorna(session) {
      if (!session) {
        if (attivo) {
          setEmail(null);
          setRuolo(null);
          setPronto(true);
        }
        return;
      }
      const { data: profilo } = await supabase
        .from("profili")
        .select("ruolo")
        .eq("id", session.user.id)
        .single();
      if (attivo) {
        setEmail(session.user.email);
        const vista = profilo?.ruolo === "admin" ? leggiVista() : null;
        setRuolo(vista ? "ospite" : profilo?.ruolo || null);
        setPronto(true);
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => aggiorna(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      aggiorna(session);
    });
    return () => {
      attivo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Se l'utente non ha mai scelto: ospite -> inglese, admin/collaboratrice -> italiano
  useEffect(() => {
    if (!pronto || scelta) return;
    if (ruolo === "ospite") setLangState("en");
    else if (ruolo === "admin" || ruolo === "collaboratore") setLangState("it");
  }, [pronto, ruolo, scelta]);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => {
    if (!LINGUE.includes(l)) return;
    setLangState(l);
    setScelta(true);
    try {
      window.localStorage.setItem(CHIAVE, l);
    } catch (e) {}
  }, []);

  const valore = useMemo(
    () => ({
      lang,
      setLang,
      t: (k, vars) => tradurre(lang, k, vars),
      pronto,
      email,
      ruolo,
    }),
    [lang, setLang, pronto, email, ruolo]
  );

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>;
}

export function useApp() {
  return useContext(Ctx);
}

// Per usare un testo tradotto dentro pagine "server": <T k="i.titolo" />
export function T({ k, vars }) {
  const { t } = useApp();
  return <>{t(k, vars)}</>;
}
