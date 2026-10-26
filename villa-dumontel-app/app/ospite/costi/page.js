"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useApp } from "../../components/AppProvider";
import { fmtData, fmtEuro } from "../../../lib/i18n";

const ANNO_CORRENTE = new Date().getFullYear();

function anno(dataStr) {
  if (!dataStr) return null;
  return parseInt(String(dataStr).slice(0, 4), 10);
}

export default function CostiOspitePage() {
  const { t, lang } = useApp();
  const euro = (n) => fmtEuro(lang, n);
  const [caricamento, setCaricamento] = useState(true);
  const [erroreAccesso, setErroreAccesso] = useState(null);
  const [spese, setSpese] = useState([]);
  const [incassi, setIncassi] = useState([]);
  const [annoSel, setAnnoSel] = useState(String(ANNO_CORRENTE));

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

      if (!profilo || profilo.ruolo !== "ospite" || !profilo.famiglia_id) {
        setErroreAccesso("ospiti");
        setCaricamento(false);
        return;
      }

      const { data: speseData } = await supabase
        .from("spese_famiglia")
        .select("*")
        .eq("famiglia_id", profilo.famiglia_id)
        .order("data", { ascending: false });
      setSpese(speseData || []);

      const { data: incassiData } = await supabase
        .from("pagamenti_famiglie")
        .select("*")
        .eq("famiglia_id", profilo.famiglia_id)
        .order("data", { ascending: false });
      setIncassi(incassiData || []);

      setCaricamento(false);
    }

    carica();
  }, []);

  const annoSpesa = (s) => s.anno_riferimento || anno(s.data);

  const anni = useMemo(() => {
    const set = new Set([ANNO_CORRENTE]);
    spese.forEach((s) => set.add(annoSpesa(s)));
    incassi.forEach((p) => set.add(anno(p.data)));
    return Array.from(set).filter(Boolean).sort((a, b) => b - a);
  }, [spese, incassi]);

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
            <a href="/login">{t("c.vaiLogin")}</a>
          </p>
        </div>
      </main>
    );
  }

  const Y = parseInt(annoSel, 10);
  const somma = (arr) => arr.reduce((t, r) => t + (r.importo || 0), 0);

  const speseAnno = spese.filter((s) => annoSpesa(s) === Y);
  const incassiAnno = incassi.filter((p) => anno(p.data) === Y);
  const riporto =
    somma(spese.filter((s) => annoSpesa(s) < Y)) -
    somma(incassi.filter((p) => anno(p.data) < Y));
  const totSpese = somma(speseAnno);
  const totIncassi = somma(incassiAnno);
  const saldo = riporto + totSpese - totIncassi;

  return (
    <main>
      <h1>{t("co.titolo")}</h1>

      <label style={{ maxWidth: "200px", marginBottom: "1.5rem" }}>
        {t("co.anno")}
        <select value={annoSel} onChange={(e) => setAnnoSel(e.target.value)}>
          {anni.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="muted" style={{ margin: "0.25rem 0" }}>
          {t("co.riporto")}: {euro(riporto)} &euro;
        </p>
        <p className="muted" style={{ margin: "0.25rem 0" }}>
          {t("co.spese")} {Y}: {euro(totSpese)} &euro;
        </p>
        <p className="muted" style={{ margin: "0.25rem 0" }}>
          {t("co.versamenti")} {Y}: {euro(totIncassi)} &euro;
        </p>
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            fontWeight: 600,
            background: saldo > 0 ? "#fde2e2" : "#dff3e3",
            color: saldo > 0 ? "#8a1f1f" : "#1f5c2e",
          }}
        >
          {saldo > 0
            ? `${t("co.daVersare")}: ${euro(saldo)} €`
            : saldo < 0
            ? `${t("co.credito")}: ${euro(-saldo)} €`
            : `${t("co.pari")}: ${euro(0)} €`}
        </div>
      </div>

      <h2>{t("co.spese")} {Y}</h2>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {speseAnno.length === 0 && <p className="muted">{t("co.nessunaSpesa")}</p>}
        {speseAnno.map((s) => (
          <div key={s.id} className="richiesta-item">
            <strong>{s.oggetto}</strong>
            <p className="descrizione">
              {fmtData(lang, s.data)} &mdash; {euro(s.importo)} &euro;
              {s.note ? ` (${s.note})` : ""}
            </p>
          </div>
        ))}
      </div>

      <h2>{t("co.versamenti")} {Y}</h2>
      <div className="card">
        {incassiAnno.length === 0 && <p className="muted">{t("co.nessunVersamento")}</p>}
        {incassiAnno.map((p) => (
          <div key={p.id} className="richiesta-item">
            <strong>{euro(p.importo)} &euro;</strong>
            <p className="descrizione">
              {fmtData(lang, p.data)}
              {p.metodo ? ` — ${p.metodo}` : ""}
              {p.note ? ` (${p.note})` : ""}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
