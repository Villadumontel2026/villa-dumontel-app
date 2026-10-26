"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { fmtData } from "../../lib/i18n";

const COLORI = ["#2f4739", "#2b6a9e", "#a2562c", "#7a4b94"];
const GIORNI_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const GIORNI_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const iso = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

export default function AdminHome() {
  const { t, lang } = useApp();
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
  const [richieste, setRichieste] = useState([]);
  const [generiche, setGeneriche] = useState([]);
  const [mese, setMese] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [giornoSel, setGiornoSel] = useState(null);
  const [filtro, setFiltro] = useState("tutte");

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
      const { data: profilo } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!profilo || profilo.ruolo !== "admin") {
        setErroreAccesso("admin");
        setCaricamento(false);
        return;
      }
      const { data: fam } = await supabase.from("famiglie").select("id, nome").order("id");
      setFamiglie(fam || []);
      const { data: ric } = await supabase
        .from("richieste")
        .select("*, alloggi(nome), famiglie(nome)")
        .neq("stato", "annullata")
        .order("data", { ascending: true });
      setRichieste(ric || []);
      const { data: gen } = await supabase
        .from("richieste_generiche")
        .select("*, famiglie(nome)")
        .eq("stato", "da fare")
        .order("scadenza", { ascending: true, nullsFirst: false });
      setGeneriche(gen || []);
      setCaricamento(false);
    }
    carica();
  }, []);

  const colore = (famigliaId) => {
    const i = famiglie.findIndex((f) => f.id === famigliaId);
    return COLORI[(i < 0 ? 0 : i) % COLORI.length];
  };

  const visibili = richieste.filter(
    (r) => r.data && (filtro === "tutte" || String(r.famiglia_id) === filtro)
  );

  const oggi = iso(new Date());
  const prossimi = visibili
    .filter((r) => r.data >= oggi && r.stato !== "completata")
    .sort(
      (a, b) =>
        String(a.data).localeCompare(String(b.data)) ||
        String(a.ora || "").localeCompare(String(b.ora || ""))
    )
    .slice(0, 10);

  const perGiorno = useMemo(() => {
    const m = {};
    visibili.forEach((r) => {
      (m[r.data] = m[r.data] || []).push(r);
    });
    Object.values(m).forEach((arr) => arr.sort((a, b) => String(a.ora || "").localeCompare(String(b.ora || ""))));
    return m;
  }, [visibili]);

  // griglia del mese (lunedi' come primo giorno)
  const celle = useMemo(() => {
    const primo = new Date(mese.getFullYear(), mese.getMonth(), 1);
    const offset = (primo.getDay() + 6) % 7;
    const giorniMese = new Date(mese.getFullYear(), mese.getMonth() + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= giorniMese; d++) out.push(new Date(mese.getFullYear(), mese.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [mese]);

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
          <p>
            {erroreAccesso === "login"
              ? t("c.loginRichiesto")
              : "Questa pagina e' riservata all'amministratore."}
          </p>
          <p>
            <a href="/login" className="btn">
              {t("c.vaiLogin")}
            </a>
          </p>
        </div>
      </main>
    );
  }

  const nuove = richieste.filter((r) => r.stato === "nuova");
  const pulizieDaAssegnare = richieste.filter(
    (r) => r.tipo === "pulizie" && !r.collaboratore_id && ["nuova", "in gestione", "confermata"].includes(r.stato)
  );
  const proposte = richieste.filter((r) => r.proposta_data);
  const giorniSett = lang === "en" ? GIORNI_EN : GIORNI_IT;
  const titoloMese = mese.toLocaleDateString(lang === "en" ? "en-GB" : "it-IT", { month: "long", year: "numeric" });
  const inAttesa = (r) => r.stato === "nuova" || r.stato === "in gestione";

  const etichettaEv = (r) =>
    (r.ora ? String(r.ora).slice(0, 5) + " " : "") + t("tipo." + r.tipo);

  const dettaglio = (r) => (
    <div key={r.id} className="richiesta-item">
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: 999,
          background: colore(r.famiglia_id),
          marginRight: 6,
        }}
      />
      <strong>
        {fmtData(lang, r.data, false)} {r.ora ? String(r.ora).slice(0, 5) : ""}
      </strong>{" "}
      &mdash; {t("tipo." + r.tipo)}
      <p className="descrizione" style={{ margin: "0.15rem 0 0" }}>
        {r.famiglie?.nome} · {r.alloggi?.nome}
        {r.descrizione ? ` — ${r.descrizione}` : ""}
        {inAttesa(r) ? " (da confermare)" : ""}
        {r.proposta_data ? " (proposta inviata)" : ""}
      </p>
    </div>
  );

  return (
    <main>
      <h1>Home</h1>

      {/* Da fare */}
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {(nuove.length > 0 || pulizieDaAssegnare.length > 0 || proposte.length > 0) && (
          <div className="card" style={{ background: "#fff6e0" }}>
            <h2 style={{ marginTop: 0 }}>Da gestire</h2>
            {nuove.length > 0 && (
              <p style={{ margin: "0.25rem 0" }}>
                <strong>{nuove.length}</strong> nuove richieste da confermare
              </p>
            )}
            {pulizieDaAssegnare.length > 0 && (
              <p style={{ margin: "0.25rem 0" }}>
                <strong>{pulizieDaAssegnare.length}</strong> pulizie senza collaboratrice
              </p>
            )}
            {proposte.length > 0 && (
              <p style={{ margin: "0.25rem 0" }}>
                <strong>{proposte.length}</strong> proposte di modifica in attesa di risposta
              </p>
            )}
            <p style={{ margin: "0.6rem 0 0" }}>
              <a href="/richieste" className="btn">
                Apri le richieste
              </a>
            </p>
          </div>
        )}

        <div className="card">
          <h2 style={{ marginTop: 0 }}>
            Richieste generiche{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              ({generiche.length})
            </span>
          </h2>
          {generiche.length === 0 && <p className="muted">Nessun promemoria aperto.</p>}
          {generiche.slice(0, 5).map((g) => {
            const giorni = g.scadenza ? Math.round((new Date(g.scadenza) - new Date(oggi)) / 86400000) : null;
            return (
              <div
                key={g.id}
                className="richiesta-item"
                style={{
                  background: giorni !== null && giorni < 0 ? "#fde2e2" : giorni !== null && giorni <= 14 ? "#fff6e0" : "transparent",
                  borderRadius: 8,
                  padding: "0.4rem 0.5rem",
                }}
              >
                <strong>{g.testo}</strong>
                <p className="descrizione" style={{ margin: "0.1rem 0 0" }}>
                  {g.famiglie?.nome || "Generale"}
                  {g.scadenza ? ` — entro il ${g.scadenza}` : ""}
                </p>
              </div>
            );
          })}
          <p style={{ margin: "0.6rem 0 0" }}>
            <a href="/richieste" className="btn btn-light">
              Gestisci i promemoria
            </a>
          </p>
        </div>
      </div>

      {/* Filtro famiglie / legenda */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button
          type="button"
          className={filtro === "tutte" ? "btn" : "btn btn-light"}
          onClick={() => setFiltro("tutte")}
          style={{ padding: "0.4rem 0.9rem" }}
        >
          Tutte
        </button>
        {famiglie.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(String(f.id))}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 8,
              cursor: "pointer",
              border: "1px solid " + colore(f.id),
              background: filtro === String(f.id) ? colore(f.id) : "transparent",
              color: filtro === String(f.id) ? "white" : colore(f.id),
              fontSize: "0.9rem",
            }}
          >
            {f.nome}
          </button>
        ))}
      </div>

      {/* Prossimi appuntamenti */}
      <h2>Prossimi appuntamenti</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {prossimi.length === 0 && <p className="muted">Nessun appuntamento in programma.</p>}
        {prossimi.map(dettaglio)}
      </div>

      {/* Calendario mensile */}
      <h2>Calendario</h2>
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-light"
            style={{ padding: "0.35rem 0.8rem" }}
            onClick={() => setMese(new Date(mese.getFullYear(), mese.getMonth() - 1, 1))}
            aria-label="Mese precedente"
          >
            &larr;
          </button>
          <strong style={{ textTransform: "capitalize" }}>{titoloMese}</strong>
          <button
            type="button"
            className="btn btn-light"
            style={{ padding: "0.35rem 0.8rem" }}
            onClick={() => setMese(new Date(mese.getFullYear(), mese.getMonth() + 1, 1))}
            aria-label="Mese successivo"
          >
            &rarr;
          </button>
        </div>

        <div className="cal-grid">
          {giorniSett.map((g) => (
            <div key={g} className="cal-head">
              {g}
            </div>
          ))}
          {celle.map((d, i) => {
            if (!d) return <div key={i} className="cal-cell vuota" />;
            const k = iso(d);
            const ev = perGiorno[k] || [];
            const selezionato = giornoSel === k;
            return (
              <div
                key={i}
                className={"cal-cell" + (k === oggi ? " oggi" : "") + (selezionato ? " sel" : "")}
                onClick={() => setGiornoSel(selezionato ? null : k)}
              >
                <span className="cal-num">{d.getDate()}</span>
                {ev.slice(0, 3).map((r) => (
                  <span
                    key={r.id}
                    className="cal-ev"
                    style={
                      inAttesa(r)
                        ? { border: "1px solid " + colore(r.famiglia_id), color: colore(r.famiglia_id), background: "white" }
                        : { background: colore(r.famiglia_id), color: "white" }
                    }
                    title={(r.famiglie?.nome || "") + " — " + t("tipo." + r.tipo)}
                  >
                    {etichettaEv(r)}
                  </span>
                ))}
                {ev.length > 3 && <span className="cal-piu">+{ev.length - 3}</span>}
              </div>
            );
          })}
        </div>

        <p className="muted" style={{ fontSize: "0.8rem", margin: "0.75rem 0 0" }}>
          Pieno = confermato &middot; contorno = da confermare. Tocca un giorno per i dettagli.
        </p>

        {giornoSel && (
          <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
            <strong>{fmtData(lang, giornoSel)}</strong>
            {(perGiorno[giornoSel] || []).length === 0 && <p className="muted">Nessun evento.</p>}
            {(perGiorno[giornoSel] || []).map(dettaglio)}
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
            .cal-head { text-align: center; font-size: 0.72rem; color: var(--color-muted); padding-bottom: 2px; }
            .cal-cell { min-height: 76px; background: #fbfaf7; border: 1px solid var(--color-border); border-radius: 6px; padding: 3px; display: flex; flex-direction: column; gap: 2px; cursor: pointer; overflow: hidden; }
            .cal-cell.vuota { background: transparent; border: none; cursor: default; }
            .cal-cell.oggi { border-color: var(--color-accent); box-shadow: inset 0 0 0 1px var(--color-accent); }
            .cal-cell.sel { background: var(--color-primary-light); }
            .cal-num { font-size: 0.72rem; color: var(--color-muted); }
            .cal-ev { font-size: 0.62rem; line-height: 1.2; border-radius: 4px; padding: 1px 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .cal-piu { font-size: 0.62rem; color: var(--color-muted); }
            @media (max-width: 520px) { .cal-cell { min-height: 58px; } .cal-ev { font-size: 0.55rem; } }
          `,
        }}
      />
    </main>
  );
}
