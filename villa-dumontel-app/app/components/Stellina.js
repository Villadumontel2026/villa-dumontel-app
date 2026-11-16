"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";

// Elenco dei preferiti dell'utente, caricato una volta sola per pagina
let cache = null;
let promessa = null;
const ascoltatori = new Set();

function carica() {
  if (!promessa) {
    promessa = supabase
      .from("posti_preferiti")
      .select("posto_id")
      .then(({ data }) => {
        cache = new Set((data || []).map((x) => x.posto_id));
        return cache;
      });
  }
  return promessa;
}

// Stellina in alto a destra sulla scheda: un clic aggiunge ai preferiti, un altro clic toglie.
export default function Stellina({ postoId }) {
  const { ruolo, lang } = useApp();
  const [attivo, setAttivo] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!ruolo) return;
    let vivo = true;
    const aggiorna = () => vivo && setAttivo(!!cache && cache.has(postoId));
    carica().then(() => {
      aggiorna();
      if (vivo) setPronto(true);
    });
    ascoltatori.add(aggiorna);
    return () => {
      vivo = false;
      ascoltatori.delete(aggiorna);
    };
  }, [ruolo, postoId]);

  if (!ruolo) return null;

  async function toggle() {
    const vuole = !attivo;
    setAttivo(vuole);
    if (cache) vuole ? cache.add(postoId) : cache.delete(postoId);
    const { error } = vuole
      ? await supabase.from("posti_preferiti").insert({ posto_id: postoId })
      : await supabase.from("posti_preferiti").delete().eq("posto_id", postoId);
    if (error) {
      setAttivo(!vuole);
      if (cache) vuole ? cache.delete(postoId) : cache.add(postoId);
    }
  }

  const titolo = attivo
    ? lang === "en" ? "Remove from favourites" : "Togli dai preferiti"
    : lang === "en" ? "Add to favourites" : "Aggiungi ai preferiti";

  return (
    <button
      type="button"
      onClick={toggle}
      title={titolo}
      aria-label={titolo}
      aria-pressed={attivo}
      disabled={!pronto}
      style={{
        position: "absolute",
        top: "0.5rem",
        right: ruolo === "admin" ? "2.9rem" : "0.5rem",
        background: "transparent",
        border: "none",
        padding: "0.2rem",
        cursor: "pointer",
        lineHeight: 0,
        color: attivo ? "#c9962b" : "var(--color-muted, #6b6b60)",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill={attivo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1L3.2 9.6l6.1-.8z" />
      </svg>
    </button>
  );
}
