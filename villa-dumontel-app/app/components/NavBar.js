"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const LINK_PER_RUOLO = {
  admin: [
    { href: "/richieste", label: "Richieste" },
    { href: "/pulizie/admin", label: "Pulizie" },
    { href: "/spese/admin", label: "Spese" },
    { href: "/riepilogo", label: "Riepilogo" },
    { href: "/calendario", label: "Calendario" },
    { href: "/info", label: "Info" },
  ],
  collaboratore: [
    { href: "/pulizie/collaboratore", label: "Pulizie" },
    { href: "/calendario", label: "Calendario" },
    { href: "/info", label: "Info" },
  ],
  ospite: [
    { href: "/ospite", label: "Home" },
    { href: "/ospite/prenota", label: "Prenota" },
    { href: "/ospite/richieste", label: "Richieste" },
    { href: "/calendario", label: "Calendario" },
    { href: "/info", label: "Info" },
  ],
};

export default function NavBar() {
  const [pronto, setPronto] = useState(false);
  const [email, setEmail] = useState(null);
  const [ruolo, setRuolo] = useState(null);
  const [aperto, setAperto] = useState(false);

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
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .site-header { position: relative; }
            .nav-toggle { display: none; }
            @media (max-width: 720px) {
              .nav-toggle {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                background: rgba(255,255,255,0.14);
                color: white;
                border: none;
                border-radius: 999px;
                padding: 0.45rem 0.9rem;
                font-size: 0.9rem;
                cursor: pointer;
              }
              .header-inner nav.menu-links {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                z-index: 50;
                flex-direction: column;
                align-items: stretch;
                gap: 0.15rem;
                padding: 0.5rem 1rem 1rem;
                background: var(--color-primary-dark, #1f3226);
                box-shadow: 0 8px 16px rgba(0,0,0,0.25);
              }
              .header-inner nav.menu-links.aperto { display: flex; }
              .header-inner nav.menu-links a {
                padding: 0.8rem 0.9rem;
                font-size: 1rem;
                opacity: 1;
                border-radius: 10px;
              }
            }
          `,
        }}
      />
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={aperto}
        aria-label="Menu"
        onClick={() => setAperto((v) => !v)}
      >
        {aperto ? "Chiudi ✕" : "Menu ☰"}
      </button>
      <nav className={"menu-links" + (aperto ? " aperto" : "")} onClick={() => setAperto(false)}>
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
    </>
  );
}
