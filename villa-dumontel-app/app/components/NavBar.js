"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";

const LINK_PER_RUOLO = {
  admin: [
    { href: "/admin", label: "nav.home" },
    { href: "/richieste", label: "nav.richieste" },
    { href: "/pulizie/admin", label: "nav.pulizie" },
    { href: "/spese/admin", label: "nav.spese" },
    { href: "/calendario", label: "nav.calendario" },
    { href: "/info", label: "nav.info" },
  ],
  collaboratore: [
    { href: "/collaboratore", label: "nav.home" },
    { href: "/pulizie/collaboratore", label: "nav.pulizie" },
    { href: "/calendario", label: "nav.calendario" },
    { href: "/info", label: "nav.info" },
  ],
  ospite: [
    { href: "/ospite", label: "nav.home" },
    { href: "/ospite/prenota", label: "nav.prenota" },
    { href: "/ospite/richieste", label: "nav.mieRichieste" },
    { href: "/calendario", label: "nav.calendario" },
    { href: "/info", label: "nav.info" },
  ],
};

export default function NavBar() {
  const { pronto, email, ruolo, lang, setLang, t } = useApp();
  const [aperto, setAperto] = useState(false);

  async function esci() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const links = ruolo && LINK_PER_RUOLO[ruolo] ? LINK_PER_RUOLO[ruolo] : [{ href: "/info", label: "nav.info" }];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .site-header { position: relative; }
            .nav-toggle { display: none; }
            .lang-switch { display: inline-flex; gap: 2px; margin-left: 0.4rem; }
            .lang-switch button {
              background: transparent; color: white; border: 1px solid rgba(255,255,255,0.35);
              border-radius: 6px; padding: 0.15rem 0.45rem; font-size: 0.75rem; cursor: pointer; opacity: 0.8;
            }
            .lang-switch button.attiva { background: rgba(255,255,255,0.22); opacity: 1; font-weight: 600; }
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
        aria-label={t("nav.menuLabel")}
        onClick={() => setAperto((v) => !v)}
      >
        {aperto ? t("nav.chiudi") : t("nav.menu")}
      </button>
      <nav className={"menu-links" + (aperto ? " aperto" : "")} onClick={() => setAperto(false)}>
        {pronto &&
          links.map((l) => (
            <a key={l.href} href={l.href}>
              {t(l.label)}
            </a>
          ))}
        {pronto && !email && <a href="/login">{t("nav.accedi")}</a>}
        {pronto && email && (
          <>
            <a href="/account" title={email}>
              {t("nav.account")}
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                esci();
              }}
            >
              {t("nav.esci")}
            </a>
          </>
        )}
        {pronto && (
          <span className="lang-switch" onClick={(e) => e.stopPropagation()}>
            {["it", "en"].map((l) => (
              <button
                key={l}
                type="button"
                className={lang === l ? "attiva" : ""}
                onClick={() => setLang(l)}
                aria-label={l === "it" ? "Italiano" : "English"}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </span>
        )}
      </nav>
    </>
  );
}
