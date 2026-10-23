"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const LINK_PER_RUOLO = {
  admin: [
    { href: "/richieste", label: "Richieste" },
    { href: "/riepilogo", label: "Riepilogo" },
    { href: "/info", label: "Info" },
  ],
  collaboratore: [
    { href: "/pulizie/collaboratore", label: "Pulizie" },
    { href: "/info", label: "Info" },
  ],
  ospite: [
    { href: "/ospite", label: "Home" },
    { href: "/ospite/prenota", label: "Prenota" },
    { href: "/info", label: "Info" },
  ],
};

export default function NavBar() {
  const [pronto, setPronto] = useState(false);
  const [email, setEmail] = useState(null);
  const [ruolo, setRuolo] = useState(null);

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
        setRuolo(profilo?.ruolo || null);
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

  async function esci() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const links = ruolo && LINK_PER_RUOLO[ruolo] ? LINK_PER_RUOLO[ruolo] : [{ href: "/info", label: "Info" }];

  return (
    <nav>
      {pronto &&
        links.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      {pronto && !email && <a href="/login">Accedi</a>}
      {pronto && email && (
        <>
          <a href="/account" title={email}>
            Account
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              esci();
            }}
          >
            Esci
          </a>
        </>
      )}
    </nav>
  );
}
