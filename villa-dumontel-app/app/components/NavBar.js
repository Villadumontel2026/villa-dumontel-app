"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";

// Menu per ruolo. Una voce con "voci" e' un gruppo (menu a tendina su PC, sezione nel foglio "Altro" su telefono).
const MENU = {
  admin: [
    { href: "/admin", label: "nav.home", esatto: true },
    {
      label: "nav.gestione",
      voci: [
        { href: "/richieste", label: "nav.richieste" },
        { href: "/pulizie/admin", label: "nav.pulizie" },
        { href: "/calendario", label: "nav.calendario" },
      ],
    },
    {
      label: "nav.conti",
      voci: [
        { href: "/spese/admin", label: "nav.spese" },
        { href: "/gasolio", label: "nav.gasolio" },
        { href: "/documenti", label: "nav.documenti" },
      ],
    },
    {
      label: "nav.cantina",
      voci: [
        { href: "/cantina", label: "nav.cantinaMappa", esatto: true },
        { href: "/cantina/indice", label: "nav.cantinaIndice" },
        { href: "/cantina/ordini", label: "nav.cantinaOrdini" },
        { href: "/cantina/vini", label: "nav.cantinaVini" },
        { href: "/cantina/scaffali", label: "nav.cantinaScaffali" },
      ],
    },
    { href: "/info", label: "nav.info" },
  ],
  collaboratore: [
    { href: "/collaboratore", label: "nav.home", esatto: true },
    { href: "/pulizie/collaboratore", label: "nav.pulizie" },
    { href: "/calendario", label: "nav.calendario" },
    { href: "/info", label: "nav.info" },
  ],
  ospite: [
    { href: "/ospite", label: "nav.home", esatto: true },
    { href: "/ospite/prenota", label: "nav.prenota" },
    { href: "/ospite/richieste", label: "nav.mieRichieste" },
    { href: "/ospite/vini", label: "nav.vini" },
    { href: "/calendario", label: "nav.calendario" },
    { href: "/info", label: "nav.info" },
  ],
};

// Barra in basso sul telefono (il resto sta in "Altro")
const BARRA = {
  admin: [
    { href: "/admin", label: "nav.home", icona: "home", esatto: true },
    { href: "/richieste", label: "nav.richieste", icona: "lista" },
    { href: "/calendario", label: "nav.calendario", icona: "cal" },
    { href: "/cantina", label: "nav.cantina", icona: "vino" },
  ],
  collaboratore: [
    { href: "/collaboratore", label: "nav.home", icona: "home", esatto: true },
    { href: "/pulizie/collaboratore", label: "nav.pulizie", icona: "lista" },
    { href: "/calendario", label: "nav.calendario", icona: "cal" },
  ],
  ospite: [
    { href: "/ospite", label: "nav.home", icona: "home", esatto: true },
    { href: "/ospite/prenota", label: "nav.prenota", icona: "piu" },
    { href: "/ospite/richieste", label: "nav.mieRichieste", icona: "lista" },
    { href: "/calendario", label: "nav.calendario", icona: "cal" },
  ],
};

const ICONE = {
  home: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  lista: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  cal: "M4 5h16v16H4zM4 10h16M9 3v4M15 3v4",
  vino: "M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v8M8 21h8",
  piu: "M12 5v14M5 12h14",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8h.01M11 12h1v5h1",
  altro: "M5 12h.01M12 12h.01M19 12h.01",
};

function Icona({ nome }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONE[nome] || ICONE.altro} />
    </svg>
  );
}

function attiva(voce, path) {
  if (!voce.href) return false;
  if (voce.esatto) return path === voce.href;
  return path === voce.href || path.startsWith(voce.href + "/");
}

export default function NavBar() {
  const { pronto, email, ruolo, lang, setLang, t } = useApp();
  const path = usePathname() || "/";
  const [gruppo, setGruppo] = useState(null); // gruppo aperto su PC
  const [foglio, setFoglio] = useState(false); // foglio "Altro" su telefono
  const rif = useRef(null);

  async function esci() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // chiude i menu cliccando fuori o cambiando pagina
  useEffect(() => {
    const fuori = (e) => {
      if (rif.current && !rif.current.contains(e.target)) setGruppo(null);
    };
    document.addEventListener("mousedown", fuori);
    return () => document.removeEventListener("mousedown", fuori);
  }, []);
  useEffect(() => {
    setGruppo(null);
    setFoglio(false);
  }, [path]);

  const voci = ruolo && MENU[ruolo] ? MENU[ruolo] : [{ href: "/info", label: "nav.info" }];
  const barra = ruolo && BARRA[ruolo] ? BARRA[ruolo] : [{ href: "/info", label: "nav.info", icona: "info" }];

  const lingua = (
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
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .site-header { position: relative; z-index: 40; }
            .lang-switch { display: inline-flex; gap: 2px; }
            .lang-switch button {
              background: transparent; color: inherit; border: 1px solid currentColor;
              border-radius: 6px; padding: 0.15rem 0.5rem; font-size: 0.78rem; cursor: pointer; opacity: 0.6;
            }
            .lang-switch button.attiva { opacity: 1; font-weight: 700; background: rgba(128,128,128,0.2); }

            /* --- PC: menu con tendine --- */
            .header-inner nav.vd-desk { display: flex; align-items: center; gap: 0.2rem; flex-wrap: wrap; justify-content: flex-end; }
            .vd-grp { position: relative; }
            .site-header .vd-btn {
              font: inherit; font-size: 0.88rem; color: white; background: transparent; border: none; cursor: pointer;
              padding: 0.4rem 0.75rem; border-radius: 999px; opacity: 0.85;
            }
            .site-header .vd-btn:hover, .site-header .vd-btn.aperto { background: rgba(255,255,255,0.12); opacity: 1; }
            .header-inner nav.vd-desk a.corrente, .site-header .vd-btn.corrente { background: rgba(255,255,255,0.18); opacity: 1; }
            .vd-panel {
              position: absolute; top: calc(100% + 6px); left: 0; min-width: 190px; z-index: 60;
              background: #fff; border-radius: 12px; padding: 0.35rem; box-shadow: 0 10px 28px rgba(0,0,0,0.28);
            }
            .vd-panel.destra { left: auto; right: 0; }
            .header-inner nav.vd-desk .vd-panel a {
              display: block; color: #26261f; opacity: 1; border-radius: 8px; padding: 0.55rem 0.8rem; font-size: 0.92rem;
            }
            .header-inner nav.vd-desk .vd-panel a:hover { background: #eef2ec; }
            .header-inner nav.vd-desk .vd-panel a.corrente { background: #e3ebe0; font-weight: 600; }
            .vd-panel .riga-lingua { display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0.8rem; color: #26261f; }

            /* --- Telefono: barra in basso + foglio "Altro" --- */
            .header-inner nav.vd-bar, .vd-foglio, .vd-velo { display: none; }
            @media (max-width: 860px) {
              .header-inner nav.vd-desk { display: none; }
              body { padding-bottom: calc(68px + env(safe-area-inset-bottom)); }
              .header-inner nav.vd-bar {
                display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 55;
                background: #1f3226; color: white; padding: 0.3rem 0.2rem calc(0.3rem + env(safe-area-inset-bottom));
                box-shadow: 0 -4px 16px rgba(0,0,0,0.25);
              }
              .header-inner nav.vd-bar a, .header-inner nav.vd-bar button {
                flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
                font: inherit; font-size: 0.68rem; color: white; background: transparent; border: none; cursor: pointer;
                text-decoration: none; padding: 0.35rem 0.1rem; border-radius: 10px; opacity: 0.7;
              }
              .header-inner nav.vd-bar a.corrente, .header-inner nav.vd-bar button.corrente { opacity: 1; background: rgba(255,255,255,0.16); }
              .vd-velo { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 56; }
              .vd-foglio {
                display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 57; max-height: 78vh; overflow-y: auto;
                background: #fff; color: #26261f; border-radius: 18px 18px 0 0; padding: 1rem 1rem calc(1.2rem + env(safe-area-inset-bottom));
              }
              .vd-foglio h3 { margin: 0.9rem 0 0.3rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6b60; }
              .site-header .vd-foglio a, .site-header .vd-foglio .vd-esci {
                display: block; color: #26261f; text-decoration: none; padding: 0.8rem 0.7rem; border-radius: 10px; font-size: 1.02rem;
                background: transparent; border: none; width: 100%; text-align: left; font-family: inherit; cursor: pointer;
              }
              .site-header .vd-foglio a.corrente { background: #e3ebe0; font-weight: 600; }
              .vd-foglio .riga-lingua { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.7rem; }
            }
          `,
        }}
      />

      {/* ===== PC ===== */}
      <nav className="menu-links vd-desk" ref={rif}>
        {pronto &&
          voci.map((v) =>
            v.voci ? (
              <div className="vd-grp" key={v.label}>
                <button
                  type="button"
                  className={"vd-btn" + (gruppo === v.label ? " aperto" : "") + (v.voci.some((x) => attiva(x, path)) ? " corrente" : "")}
                  aria-expanded={gruppo === v.label}
                  onClick={() => setGruppo(gruppo === v.label ? null : v.label)}
                >
                  {t(v.label)} ▾
                </button>
                {gruppo === v.label && (
                  <div className="vd-panel">
                    {v.voci.map((x) => (
                      <a key={x.href} href={x.href} className={attiva(x, path) ? "corrente" : ""}>
                        {t(x.label)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <a key={v.href} href={v.href} className={attiva(v, path) ? "corrente" : ""}>
                {t(v.label)}
              </a>
            )
          )}
        {pronto && !email && <a href="/login">{t("nav.accedi")}</a>}
        {pronto && (
          <div className="vd-grp">
            <button
              type="button"
              className={"vd-btn" + (gruppo === "utente" ? " aperto" : "")}
              aria-expanded={gruppo === "utente"}
              title={email || ""}
              onClick={() => setGruppo(gruppo === "utente" ? null : "utente")}
            >
              {email ? t("nav.account") : lang.toUpperCase()} ▾
            </button>
            {gruppo === "utente" && (
              <div className="vd-panel destra">
                {email && (
                  <a href="/account" className={path.startsWith("/account") ? "corrente" : ""}>
                    {t("nav.account")}
                  </a>
                )}
                <div className="riga-lingua">
                  <span>{lang === "en" ? "Language" : "Lingua"}</span>
                  {lingua}
                </div>
                {email && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      esci();
                    }}
                  >
                    {t("nav.esci")}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ===== Telefono ===== */}
      {pronto && (
        <>
          <nav className="vd-bar" aria-label={t("nav.menuLabel")}>
            {barra.map((b) => (
              <a key={b.href} href={b.href} className={attiva(b, path) ? "corrente" : ""}>
                <Icona nome={b.icona} />
                {t(b.label)}
              </a>
            ))}
            <button type="button" className={foglio ? "corrente" : ""} onClick={() => setFoglio((v) => !v)} aria-expanded={foglio}>
              <Icona nome="altro" />
              {t("nav.altro")}
            </button>
          </nav>
          {foglio && (
            <>
              <div className="vd-velo" onClick={() => setFoglio(false)} />
              <div className="vd-foglio" role="dialog" aria-label={t("nav.menuLabel")}>
                {voci.map((v) =>
                  v.voci ? (
                    <div key={v.label}>
                      <h3>{t(v.label)}</h3>
                      {v.voci.map((x) => (
                        <a key={x.href} href={x.href} className={attiva(x, path) ? "corrente" : ""}>
                          {t(x.label)}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <a key={v.href} href={v.href} className={attiva(v, path) ? "corrente" : ""}>
                      {t(v.label)}
                    </a>
                  )
                )}
                <h3>{email ? email : t("nav.accedi")}</h3>
                {!email && <a href="/login">{t("nav.accedi")}</a>}
                {email && <a href="/account">{t("nav.account")}</a>}
                <div className="riga-lingua">
                  <span>{lang === "en" ? "Language" : "Lingua"}</span>
                  {lingua}
                </div>
                {email && (
                  <button type="button" className="vd-esci" onClick={esci}>
                    {t("nav.esci")}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
