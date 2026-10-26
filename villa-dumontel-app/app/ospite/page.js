"use client";

import { useEffect, useState } from "react";
import { applicaVista } from "../../lib/vista";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { fmtData, traduciVoci, traduciSotto } from "../../lib/i18n";

const ICONE = {
  prenota: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  richieste: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  costi: <path d="M18 7a6 6 0 1 0 0 10M4 10h9M4 14h9" />,
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
};

function Icona({ nome }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONE[nome]}
    </svg>
  );
}

export default function OspiteHome() {
  const { t, lang } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglia, setFamiglia] = useState(null);
  const [alloggi, setAlloggi] = useState([]);
  const [inCorso, setInCorso] = useState([]);
  const [novita, setNovita] = useState([]);

  useEffect(() => {
    async function carica() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErroreAccesso("login");
        setCaricamento(false);
        return;
      }

      const { data: profiloRaw } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();
      const profilo = applicaVista(profiloRaw);

      if (!profilo || profilo.ruolo !== "ospite" || !profilo.famiglia_id) {
        setErroreAccesso("ospiti");
        setCaricamento(false);
        return;
      }

      const { data: fam } = await supabase
        .from("famiglie")
        .select("*")
        .eq("id", profilo.famiglia_id)
        .single();
      setFamiglia(fam);

      const { data: all } = await supabase
        .from("alloggi")
        .select("*")
        .eq("famiglia_id", profilo.famiglia_id);
      setAlloggi(all || []);

      const { data: ric } = await supabase
        .from("richieste")
        .select("*")
        .eq("famiglia_id", profilo.famiglia_id)
        .in("stato", ["nuova", "in gestione", "confermata"])
        .order("data", { ascending: true });
      setInCorso(ric || []);

      const { data: nov } = await supabase
        .from("novita")
        .select("*")
        .eq("attiva", true)
        .order("data_pubblicazione", { ascending: false })
        .limit(2);
      setNovita(nov || []);
      setCaricamento(false);
    }

    carica();
  }, []);

  const oggi = new Date().toISOString().slice(0, 10);
  const fra2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const pulizieDaPreparare = inCorso.filter(
    (r) => r.tipo === "pulizie" && r.data && r.data >= oggi && r.data <= fra2 && !r.descrizione
  );

  const conProposta = inCorso.filter((r) => r.proposta_data);
  const inviate = inCorso.filter((r) => r.stato === "nuova" || r.stato === "in gestione").length;
  const prenotate = inCorso.filter((r) => r.stato === "confermata").length;

  const prossimi = inCorso
    .filter((r) => r.data && r.data >= oggi)
    .sort(
      (a, b) =>
        String(a.data).localeCompare(String(b.data)) ||
        String(a.ora || "").localeCompare(String(b.ora || ""))
    )
    .slice(0, 5);

  if (caricamento) {
    return (
      <main>
        <p>{t("c.caricamento")}</p>
      </main>
    );
  }

  if (erroreAccesso) {
    return (
      <main>
        <div className="card">
          <p>{erroreAccesso === "login" ? t("c.loginRichiesto") : t("c.soloOspiti")}</p>
          <p>
            <a href="/login" className="btn">
              {t("c.vaiLogin")}
            </a>
          </p>
        </div>
      </main>
    );
  }

  const azioni = [
    { href: "/ospite/prenota", icona: "prenota", titolo: t("oh.azPrenota"), sub: t("oh.azPrenotaSub"), primaria: true },
    {
      href: "/ospite/richieste",
      icona: "richieste",
      titolo: t("oh.azRichieste"),
      sub: t("oh.azRichiesteSub", { inviate, prenotate }),
    },
    { href: "/ospite/costi", icona: "costi", titolo: t("oh.azCosti"), sub: t("oh.azCostiSub") },
    { href: "/calendario", icona: "calendario", titolo: t("oh.azCalendario"), sub: t("oh.azCalendarioSub") },
    { href: "/info", icona: "info", titolo: t("oh.azInfo"), sub: t("oh.azInfoSub") },
  ];

  return (
    <main>
      <p
        className="muted"
        style={{ letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.75rem", margin: 0 }}
      >
        {t("oh.benvenuti")}
      </p>
      <h1 style={{ margin: "0.15rem 0 0.25rem" }}>{famiglia?.nome || ""}</h1>
      {alloggi.length > 0 && (
        <p className="muted" style={{ margin: "0 0 1.5rem" }}>
          {alloggi.map((a) => a.nome).join(" · ")}
        </p>
      )}

      {conProposta.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem", background: "#fff6e0" }}>
          <p style={{ margin: 0 }}>
            <strong>{t("pm.home")}</strong>{" "}
            <a href="/ospite/richieste" className="btn btn-light">
              {t("pm.vedi")}
            </a>
          </p>
        </div>
      )}

      {pulizieDaPreparare.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: "1rem", background: "#fff6e0" }}>
          <p style={{ margin: 0 }}>
            <strong>
              {t("oh.reminder1", { data: fmtData(lang, r.data, false) })}
              {r.ora ? " · " + String(r.ora).slice(0, 5) : ""}.
            </strong>{" "}
            {t("oh.reminder2")} <a href="/ospite/richieste" className="btn btn-light">
              {t("oh.reminder3")}
            </a>
          </p>
        </div>
      ))}

      {novita.length > 0 && (
        <a
          href="/novita"
          className="card"
          style={{
            display: "block",
            marginBottom: "1.25rem",
            textDecoration: "none",
            color: "inherit",
            borderLeft: "4px solid var(--color-accent)",
          }}
        >
          <p
            className="muted"
            style={{ margin: 0, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.72rem" }}
          >
            {t("nov.titolo")}
          </p>
          {novita.map((n) => (
            <p key={n.id} style={{ margin: "0.35rem 0 0" }}>
              <strong>{(lang === "en" && n.titolo_en) || n.titolo_it}</strong>
            </p>
          ))}
          <p style={{ margin: "0.6rem 0 0" }}>
            <span className="btn btn-light">{t("nov.vedi")}</span>
          </p>
        </a>
      )}

      <h2 style={{ marginTop: "0.5rem" }}>{t("oh.cosaFare")}</h2>
      <div className="azioni-grid">
        {azioni.map((a) => (
          <a key={a.href} href={a.href} className={"card azione" + (a.primaria ? " primaria" : "")}>
            <Icona nome={a.icona} />
            <strong>{a.titolo}</strong>
            <span>{a.sub}</span>
          </a>
        ))}
      </div>

      <h2 style={{ marginTop: "2rem" }}>{t("oh.prossimi")}</h2>
      <div className="card">
        {prossimi.length === 0 && <p className="muted">{t("oh.nessunoProssimo")}</p>}
        {prossimi.map((r) => (
          <a
            key={r.id}
            href="/ospite/richieste"
            className="richiesta-item"
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <strong>
              {fmtData(lang, r.data, false)}
              {r.ora ? " · " + String(r.ora).slice(0, 5) : ""}
            </strong>
            <p className="descrizione" style={{ margin: "0.15rem 0 0" }}>
              {t("tipo." + r.tipo)}
              {r.sotto_tipo && r.tipo !== "trasporto" ? ` — ${traduciSotto(lang, r.sotto_tipo)}` : ""}
              {r.sotto_tipo && r.tipo === "trasporto" ? ` — ${r.sotto_tipo}` : ""}
              {r.descrizione
                ? ` — ${r.tipo === "pulizie" ? traduciVoci(lang, r.descrizione) : r.descrizione}`
                : ""}
              {r.stato !== "confermata" ? ` (${t("oh.inAttesa")})` : ""}
            </p>
          </a>
        ))}
        <p style={{ margin: "0.75rem 0 0" }}>
          <a href="/ospite/richieste" className="btn btn-light">
            {t("oh.tutte")}
          </a>
        </p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .azioni-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.85rem; margin-top: 0.75rem; }
            .azione { display: flex; flex-direction: column; gap: 0.35rem; text-decoration: none; color: var(--color-text); padding: 1.1rem; transition: transform 0.1s ease, box-shadow 0.15s ease; }
            .azione:hover { box-shadow: var(--shadow-hover); }
            .azione:active { transform: scale(0.98); }
            .azione svg { color: var(--color-primary); }
            .azione strong { font-family: "Fraunces", Georgia, serif; font-size: 1.05rem; }
            .azione span { color: var(--color-muted); font-size: 0.82rem; line-height: 1.3; }
            .azione.primaria { background: var(--color-primary); color: white; grid-column: 1 / -1; }
            .azione.primaria svg, .azione.primaria strong, .azione.primaria span { color: white; }
            .azione.primaria span { opacity: 0.85; }
            @media (min-width: 640px) { .azioni-grid { grid-template-columns: repeat(3, 1fr); } .azione.primaria { grid-column: auto; } }
          `,
        }}
      />
    </main>
  );
}
