"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { calcolaPeriodi, arrotonda } from "../../lib/gasolio";
import { dmy } from "../../lib/i18n";
import { Matita, Cestino } from "../components/IconeAzione";

const fmt = (n, d = 2) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : Number(n).toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
const oggi = () => new Date().toISOString().slice(0, 10);
const TIPI_CONTATORE = [
  ["calore_generale", "Calore generale (MWh)"],
  ["calore", "Calore di un'unità (MWh)"],
  ["acqua_calda", "Acqua calda (MWh)"],
  ["contalitri", "Contalitri acqua calda (m³)"],
  ["caldaia_litri", "Caldaia, litri di gasolio"],
  ["acquedotto", "Acquedotto (m³)"],
  ["altro", "Altro"],
];
const GRUPPI_LETTURE = [
  ["riscaldamento", "Riscaldamento e acqua calda"],
  ["acquedotto", "Acquedotto"],
  ["desayeux", "Casa Désayeux"],
  ["altro", "Altro"],
];
const SCHEDE = [
  ["conti", "Conti"],
  ["letture", "Letture"],
  ["acquisti", "Acquisti gasolio"],
  ["saldi", "Conti famiglie"],
  ["impostazioni", "Impostazioni"],
];

export default function GasolioPage() {
  const [stato, setStato] = useState("carico");
  const [scheda, setScheda] = useState("conti");
  const [msg, setMsg] = useState(null);
  const [famiglie, setFamiglie] = useState([]);
  const [unita, setUnita] = useState([]);
  const [contatori, setContatori] = useState([]);
  const [letture, setLetture] = useState([]);
  const [tariffe, setTariffe] = useState([]);
  const [acquisti, setAcquisti] = useState([]);
  const [anticipi, setAnticipi] = useState([]);
  const [modLettura, setModLettura] = useState(null); // data in modifica
  const [modAcquisto, setModAcquisto] = useState(null);
  const [modAnticipo, setModAnticipo] = useState(null);
  const [modTariffa, setModTariffa] = useState(null);
  const [famSel, setFamSel] = useState(null);
  const [gruppoLetture, setGruppoLetture] = useState("riscaldamento");
  const [contiDal, setContiDal] = useState("");
  const [ponderazioneDal, setPonderazioneDal] = useState("");
  const [offsetLitri, setOffsetLitri] = useState(0);
  const [consumiDef, setConsumiDef] = useState([]);
  const [defVals, setDefVals] = useState({});
  const [periodoSel, setPeriodoSel] = useState(null);

  async function carica() {
    const q = (t, o) => supabase.from(t).select("*").order(o.col, { ascending: o.asc !== false });
    const imp = await supabase.from("impostazioni_gasolio").select("*");
    const impo = Object.fromEntries((imp.data || []).map((x) => [x.chiave, x.valore]));
    setContiDal(impo.conti_dal || "");
    setPonderazioneDal(impo.ponderazione_dal || "");
    setOffsetLitri(parseFloat(impo.offset_litri) || 0);
    const cd = await supabase.from("consumi_gasolio").select("*");
    setConsumiDef(cd.data || []);
    const [f, u, c, l, t, a, n] = await Promise.all([
      supabase.from("famiglie").select("id, nome, test").order("id"),
      q("unita_consumo", { col: "ordine" }),
      q("contatori", { col: "ordine" }),
      supabase.from("letture").select("*").order("data", { ascending: true }).limit(5000),
      q("tariffe_gasolio", { col: "valida_dal", asc: false }),
      q("acquisti_gasolio", { col: "data", asc: false }),
      q("anticipi_gasolio", { col: "data", asc: false }),
    ]);
    const err = [f, u, c, l, t, a, n].find((x) => x.error);
    if (err) return setMsg("Errore: " + err.error.message + " (hai lanciato lo SQL 15_gasolio?)");
    setFamiglie((f.data || []).filter((x) => !x.test));
    setUnita(u.data || []);
    setContatori(c.data || []);
    setLetture(l.data || []);
    setTariffe(t.data || []);
    setAcquisti(a.data || []);
    setAnticipi(n.data || []);
  }

  useEffect(() => {
    async function inizio() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setStato("login");
      const { data: p } = await supabase.from("profili").select("ruolo").eq("id", session.user.id).single();
      if (p?.ruolo !== "admin") return setStato("no");
      await carica();
      setStato("ok");
    }
    inizio();
  }, []);

  async function esegui(promessa, ok) {
    setMsg(null);
    const { error } = await promessa;
    if (error) {
      setMsg("Errore: " + error.message);
      return false;
    }
    await carica();
    if (ok) ok();
    return true;
  }

  const periodi = useMemo(
    () => calcolaPeriodi({ unita, contatori, letture, tariffe, acquisti, ponderazioneDal, offsetLitri }),
    [unita, contatori, letture, tariffe, acquisti, ponderazioneDal, offsetLitri]
  );

  const periodoVisto =
    periodi.find((p) => p.da + "|" + p.a === periodoSel) || periodi[periodi.length - 1] || null;
  const defSalvato = (p, unitaId) =>
    consumiDef.find((c) => String(c.data_da).slice(0, 10) === p.da && String(c.data_a).slice(0, 10) === p.a && c.unita_id === unitaId);
  useEffect(() => {
    if (!periodoVisto) return;
    const v = {};
    for (const r of periodoVisto.righe) {
      const sv = defSalvato(periodoVisto, r.unita.id);
      v[r.unita.id] = sv ? String(sv.importo) : r.totale !== null ? String(arrotonda(r.totale)) : "";
    }
    setDefVals(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoVisto?.da, periodoVisto?.a, consumiDef, periodi]);

  const nomeFam = (id) => famiglie.find((f) => f.id === id)?.nome || "—";

  if (stato === "carico")
    return (
      <main>
        <p>Caricamento...</p>
      </main>
    );
  if (stato !== "ok")
    return (
      <main>
        <div className="card">
          <p>{stato === "login" ? "Devi accedere." : "Pagina riservata all'amministratore."}</p>
          <p>
            <a href="/login" className="btn">
              Vai al login
            </a>
          </p>
        </div>
      </main>
    );

  async function salvaDefinitivi(p) {
    const righe = p.righe
      .map((r) => ({
        data_da: p.da,
        data_a: p.a,
        unita_id: r.unita.id,
        importo: parseFloat(defVals[r.unita.id]),
        reale: r.totale !== null ? arrotonda(r.totale) : null,
        aggiornato_il: new Date().toISOString(),
      }))
      .filter((x) => !Number.isNaN(x.importo));
    if (righe.length === 0) return setMsg("Inserisci almeno un importo.");
    await esegui(supabase.from("consumi_gasolio").upsert(righe, { onConflict: "data_da,data_a,unita_id" }));
  }
  async function ripristinaCalcolato(p) {
    if (!window.confirm("Eliminare i valori definitivi di questo periodo e tornare al calcolato?")) return;
    await esegui(supabase.from("consumi_gasolio").delete().eq("data_da", p.da).eq("data_a", p.a));
  }

  // ---------- Conti ----------
  // (periodo mostrato: di default l'ultimo)
  const schedaConti = (
    <>
      <p className="muted">
        Per ogni periodo tra due letture: riscaldamento (costo generale ripartito sui consumi, Le Four all&apos;80%) più acqua
        calda (contalitri), come nel foglio dei conti. Il risultato non entra nelle spese in automatico.
      </p>
      {periodi.length === 0 && <p className="muted">Servono almeno due date di lettura.</p>}
      {periodi.length > 0 && (
        <label>
          Periodo di lettura
          <select
            value={periodoVisto ? periodoVisto.da + "|" + periodoVisto.a : ""}
            onChange={(e) => setPeriodoSel(e.target.value)}
          >
            {[...periodi].reverse().map((p) => (
              <option key={p.da + p.a} value={p.da + "|" + p.a}>
                {dmy(p.da)} → {dmy(p.a)}
              </option>
            ))}
          </select>
        </label>
      )}
      {(periodoVisto ? [periodoVisto] : []).map((p) => (
        <div key={p.da + p.a} className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>
            {dmy(p.da)} &rarr; {dmy(p.a)}
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {p.tariffa
              ? `Tariffe: ${fmt(p.tariffa.eur_mwh)} €/MWh · ${fmt(p.tariffa.eur_m3)} €/m³` +
                (p.tariffa.eur_l_condomini ? ` · gasolio ${fmt(p.tariffa.eur_l_condomini)} €/l` : "")
              : "Tariffe mancanti"}
            {" · "}costo generale riscaldamento {fmt(p.costoGenerale)} € (al prezzo di riferimento {fmt(p.rif)} €/l)
          </p>
          {p.storico && (
            <p className="muted" style={{ marginTop: 0 }}>
              Periodo storico: tariffe di riferimento (gasolio a {fmt(p.rif)} €/l), senza ponderazione sul prezzo del gasolio.
            </p>
          )}
          {p.prezzi && (
            <p className="muted" style={{ marginTop: 0 }}>
              Gasolio bruciato nel periodo ({fmt(p.prezzi.litri, 0)} l, prima il più vecchio): prezzo medio pieno{" "}
              {fmt(p.prezzi.pieno, 3)} €/l · scontato {fmt(p.prezzi.scontato, 3)} €/l. Le tariffe sono proporzionate a questo
              prezzo rispetto a {fmt(p.rif)} €/l.
            </p>
          )}
          {p.avvisi.length > 0 && (
            <p style={{ background: "#fff6e0", padding: "0.4rem 0.6rem", borderRadius: 8 }}>{p.avvisi.join(" · ")}</p>
          )}
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ overflowX: "auto", flex: "1 1 26rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "right", color: "var(--color-muted)" }}>
                  <th style={{ textAlign: "left" }}>Unità</th>
                  <th>Gasolio €/l</th>
                  <th>MWh</th>
                  <th>Riscald. €</th>
                  <th>m³ acqua</th>
                  <th>Acqua €</th>
                  <th>Totale €</th>
                </tr>
              </thead>
              <tbody>
                {p.righe.map((r) => (
                  <tr key={r.unita.id} style={{ textAlign: "right", borderTop: "1px solid var(--color-border)" }}>
                    <td style={{ textAlign: "left" }}>
                      {r.unita.nome}
                      {r.unita.famiglia_id ? <span className="muted"> · {nomeFam(r.unita.famiglia_id)}</span> : null}
                    </td>
                    <td>
                      {r.prezzoL !== null ? fmt(r.prezzoL, 3) : "—"}
                      <span className="muted"> {r.unita.prezzo_gasolio === "scontato" ? "scont." : "pieno"}</span>
                    </td>
                    <td>{fmt(r.deltaCalore, 3)}</td>
                    <td>{fmt(r.riscaldamento)}</td>
                    <td>{fmt(r.deltaAcqua, 2)}</td>
                    <td>{fmt(r.acqua)}</td>
                    <td>
                      <strong>{fmt(r.totale)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ flex: "0 1 15rem", background: "#f7f5ef", borderRadius: 10, padding: "0.75rem" }}>
            <strong>Valori definitivi</strong>
            <p className="muted" style={{ fontSize: "0.8em", margin: "0.15rem 0 0.5rem" }}>
              Scrivi tu l&apos;importo da addebitare. Il valore calcolato resta in memoria.
            </p>
            {p.righe.map((r) => {
              const sv = defSalvato(p, r.unita.id);
              return (
                <label key={r.unita.id} style={{ fontWeight: 400 }}>
                  {r.unita.nome} (€)
                  <input
                    type="number"
                    step="0.01"
                    value={defVals[r.unita.id] ?? ""}
                    onChange={(e) => setDefVals({ ...defVals, [r.unita.id]: e.target.value })}
                    style={{ marginBottom: 0 }}
                  />
                  <span className="muted" style={{ fontSize: "0.8em" }}>
                    calcolato {fmt(r.totale)} €{sv ? " · salvato" : ""}
                  </span>
                </label>
              );
            })}
            {famiglie.map((f) => {
              const unitaF = p.righe.filter((r) => r.unita.famiglia_id === f.id);
              if (unitaF.length === 0) return null;
              const somma = unitaF.reduce((s2, r) => s2 + (parseFloat(defVals[r.unita.id]) || 0), 0);
              return (
                <p key={f.id} style={{ margin: "0.4rem 0 0" }}>
                  <strong>{f.nome}</strong>: {fmt(somma)} €{" "}
                  <span className="muted" style={{ fontSize: "0.8em" }}>
                    ({unitaF.map((r) => r.unita.nome).join(" + ")})
                  </span>
                </p>
              );
            })}
            <p style={{ margin: "0.6rem 0 0", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={() => salvaDefinitivi(p)}>
                Salva
              </button>
              {p.righe.some((r) => defSalvato(p, r.unita.id)) && (
                <button type="button" className="btn btn-light" onClick={() => ripristinaCalcolato(p)}>
                  Usa il calcolato
                </button>
              )}
            </p>
          </div>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            {Object.entries(p.perFamiglia).map(([fid, tot]) => (
              <p key={fid} style={{ margin: "0.2rem 0" }}>
                <strong>{nomeFam(Number(fid))}</strong>: {fmt(tot)} € calcolati
              </p>
            ))}
            {p.litri !== null && (
              <p className="muted" style={{ margin: "0.4rem 0 0" }}>
                Gasolio consumato dalla caldaia: {fmt(p.litri, 0)} l ({fmt(p.costoGasolio)} € al prezzo condomini)
              </p>
            )}
          </div>
        </div>
      ))}
    </>
  );

  // ---------- Letture ----------
  // le letture sono divise in gruppi (riscaldamento e acqua calda, acquedotto, ...): si sceglie dall'elenco
  const nomeUnita = (id) => unita.find((u) => u.id === id)?.nome;
  const gruppoDi = (c) =>
    c.tipo === "acquedotto"
      ? "acquedotto"
      : nomeUnita(c.unita_id) === "Casa Désayeux"
      ? "desayeux"
      : c.tipo === "altro"
      ? "altro"
      : "riscaldamento";
  const contGruppo = contatori.filter((c) => gruppoDi(c) === gruppoLetture);
  const idGruppo = new Set(contGruppo.map((c) => c.id));
  const dateLetture = [
    ...new Set(letture.filter((l) => idGruppo.has(l.contatore_id)).map((l) => String(l.data).slice(0, 10))),
  ]
    .sort()
    .reverse();
  const contAttivi = contGruppo.filter((c) => c.attivo);
  const ultimo = (cid, prima) => {
    const l = letture
      .filter((x) => x.contatore_id === cid && (!prima || String(x.data).slice(0, 10) < prima))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)))[0];
    return l ? Number(l.valore) : null;
  };
  const valoreData = (cid, data) => {
    const l = letture.find((x) => x.contatore_id === cid && String(x.data).slice(0, 10) === data);
    return l ? Number(l.valore) : "";
  };

  async function salvaLetture(e) {
    e.preventDefault();
    const f = e.target;
    const data = f.data.value;
    const righe = [];
    for (const c of contAttivi) {
      const v = f["c" + c.id].value;
      if (v !== "") righe.push({ contatore_id: c.id, data, valore: parseFloat(String(v).replace(",", ".")) });
    }
    if (!data || righe.length === 0) return setMsg("Indica la data e almeno un valore.");
    await esegui(
      supabase.from("letture").upsert(righe, { onConflict: "contatore_id,data" }),
      () => setModLettura(null)
    );
  }

  const gruppiContatori = unita
    .map((u) => ({ u, lista: contAttivi.filter((c) => c.unita_id === u.id) }))
    .concat([{ u: { id: null, nome: "Senza unità" }, lista: contAttivi.filter((c) => !c.unita_id) }])
    .filter((g) => g.lista.length > 0);

  const schedaLetture = (
    <>
      <label>
        Tipo di lettura
        <select
          value={gruppoLetture}
          onChange={(e) => {
            setGruppoLetture(e.target.value);
            setModLettura(null);
          }}
        >
          {GRUPPI_LETTURE.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{modLettura ? "Modifica letture del " + dmy(modLettura) : "Nuova lettura"}</h2>
        <form onSubmit={salvaLetture} key={modLettura || "nuova"}>
          <label>
            Data
            <input type="date" name="data" defaultValue={modLettura || oggi()} required />
          </label>
          {gruppiContatori.map((g) => (
            <div key={g.u.id || "x"} style={{ margin: "0.75rem 0" }}>
              <strong>{g.u.nome}</strong>
              {g.lista.map((c) => (
                <label key={c.id} style={{ fontWeight: 400 }}>
                  {c.nome} {c.misura ? `(${c.misura})` : ""}
                  <input
                    type="number"
                    step="any"
                    name={"c" + c.id}
                    defaultValue={modLettura ? valoreData(c.id, modLettura) : ""}
                    placeholder={ultimo(c.id, modLettura) !== null ? "ultima: " + ultimo(c.id, modLettura) : ""}
                  />
                </label>
              ))}
            </div>
          ))}
          <button type="submit" className="btn">
            Salva letture
          </button>{" "}
          {modLettura && (
            <button type="button" className="btn btn-light" onClick={() => setModLettura(null)}>
              Annulla
            </button>
          )}
        </form>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Letture registrate: {GRUPPI_LETTURE.find((g) => g[0] === gruppoLetture)?.[1]}</h2>
        {dateLetture.length === 0 && <p className="muted">Nessuna lettura.</p>}
        {dateLetture.map((d) => (
          <div key={d} className="richiesta-item">
            <strong>{dmy(d)}</strong>
            <span style={{ marginLeft: "0.5rem" }}>
              <Matita
                onClick={() => {
                  setModLettura(d);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
              <Cestino
                onClick={() => {
                  if (window.confirm("Eliminare tutte le letture del " + dmy(d) + "?"))
                    esegui(supabase.from("letture").delete().eq("data", d).in("contatore_id", [...idGruppo]));
                }}
              />
            </span>
            <p className="descrizione" style={{ margin: "0.2rem 0 0" }}>
              {contGruppo
                .filter((c) => valoreData(c.id, d) !== "")
                .map((c) => `${c.nome}: ${valoreData(c.id, d)}`)
                .join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </>
  );

  // ---------- Acquisti ----------
  async function salvaAcquisto(e) {
    e.preventDefault();
    const f = e.target;
    const riga = {
      data: f.data.value,
      litri: parseFloat(f.litri.value),
      costo: parseFloat(f.costo.value),
      fornitore: f.fornitore.value || null,
      pagato_da: f.pagato_da.value || null,
      prezzo_l_scontato: f.prezzo_l_scontato.value ? parseFloat(f.prezzo_l_scontato.value) : null,
      prezzo_l_pieno: f.prezzo_l_pieno.value ? parseFloat(f.prezzo_l_pieno.value) : null,
      note: f.note.value || null,
    };
    const q = modAcquisto
      ? supabase.from("acquisti_gasolio").update(riga).eq("id", modAcquisto.id)
      : supabase.from("acquisti_gasolio").insert(riga);
    await esegui(q, () => {
      setModAcquisto(null);
    });
  }
  const totAcq = acquisti.reduce((s, a) => ({ litri: s.litri + Number(a.litri), costo: s.costo + Number(a.costo) }), {
    litri: 0,
    costo: 0,
  });
  const schedaAcquisti = (
    <>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{modAcquisto ? "Modifica acquisto" : "Nuovo acquisto di gasolio"}</h2>
        <form onSubmit={salvaAcquisto} key={modAcquisto ? modAcquisto.id : "nuovo"}>
          <label>
            Data
            <input type="date" name="data" defaultValue={modAcquisto?.data || oggi()} required />
          </label>
          <label>
            Litri
            <input type="number" step="any" name="litri" defaultValue={modAcquisto?.litri || ""} required />
          </label>
          <label>
            Costo (€)
            <input type="number" step="0.01" name="costo" defaultValue={modAcquisto?.costo || ""} required />
          </label>
          <label>
            Prezzo al litro scontato (€/l, IVA inclusa, quello pagato)
            <input type="number" step="any" name="prezzo_l_scontato" defaultValue={modAcquisto?.prezzo_l_scontato || ""} placeholder="vuoto = costo ÷ litri" />
          </label>
          <label>
            Prezzo al litro pieno (€/l, senza sconto di defiscalizzazione)
            <input type="number" step="any" name="prezzo_l_pieno" defaultValue={modAcquisto?.prezzo_l_pieno || ""} placeholder="vuoto = scontato + 0,12256" />
          </label>
          <label>
            Fornitore
            <input name="fornitore" defaultValue={modAcquisto?.fornitore || "Saint Vincent Petroli"} />
          </label>
          <label>
            Pagato da
            <select
              name="pagato_da"
              defaultValue={
                ["JD", "M&P"].includes(modAcquisto?.pagato_da) ? modAcquisto.pagato_da : modAcquisto ? "Altro" : "JD"
              }
            >
              <option value="JD">JD</option>
              <option value="M&P">M&amp;P</option>
              <option value="Altro">Altro</option>
            </select>
          </label>
          <label>
            Note
            <textarea name="note" defaultValue={modAcquisto?.note || ""}></textarea>
          </label>
          <button type="submit" className="btn">
            Salva
          </button>{" "}
          {modAcquisto && (
            <button type="button" className="btn btn-light" onClick={() => setModAcquisto(null)}>
              Annulla
            </button>
          )}
        </form>
      </div>
      <div className="card">
        {(() => {
          const g = contatori.find((c) => c.tipo === "caldaia_litri" && nomeUnita(c.unita_id) === "Generale");
          const ult = g
            ? letture.filter((l) => l.contatore_id === g.id).sort((a, b) => String(b.data).localeCompare(String(a.data)))[0]
            : null;
          if (!ult) return null;
          const acqFino = acquisti.filter((a) => String(a.data) <= String(ult.data).slice(0, 10)).reduce((x, a) => x + Number(a.litri), 0);
          return (
            <p className="muted" style={{ marginTop: 0 }}>
              Controllo: al {dmy(ult.data)} acquistati {fmt(acqFino, 0)} l, caldaia a {fmt(Number(ult.valore), 0)} l
              {offsetLitri ? ` (+${fmt(offsetLitri, 0)} l iniziali)` : ""} &rarr; giacenza stimata{" "}
              {fmt(acqFino + offsetLitri - Number(ult.valore), 0)} l. Se non torna con il serbatoio, manca qualche acquisto
              (o serve l&apos;offset).
            </p>
          );
        })()}
        <h2 style={{ marginTop: 0 }}>
          Acquisti{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            ({fmt(totAcq.litri, 0)} l · {fmt(totAcq.costo)} €)
          </span>
        </h2>
        {acquisti.map((a) => (
          <div key={a.id} className="richiesta-item">
            <strong>{dmy(a.data)}</strong> &mdash; {fmt(a.litri, 0)} l &mdash; {fmt(a.costo)} € (
            {fmt(Number(a.costo) / Number(a.litri))} €/l)
            <span style={{ marginLeft: "0.5rem" }}>
              <Matita
                onClick={() => {
                  setModAcquisto(a);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
              <Cestino
                onClick={() => {
                  if (window.confirm("Eliminare questo acquisto?")) esegui(supabase.from("acquisti_gasolio").delete().eq("id", a.id));
                }}
              />
            </span>
            <p className="descrizione" style={{ margin: "0.15rem 0 0" }}>
              {[
                `scontato ${fmt(a.prezzo_l_scontato ? Number(a.prezzo_l_scontato) : Number(a.costo) / Number(a.litri), 4)} €/l`,
                a.prezzo_l_pieno ? `pieno ${fmt(Number(a.prezzo_l_pieno), 4)} €/l` : "pieno stimato",
                a.fornitore,
                a.pagato_da ? "pagato da " + a.pagato_da : null,
                a.note,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </>
  );

  // ---------- Conti famiglie ----------
  async function salvaMovimento(e) {
    e.preventDefault();
    const f = e.target;
    const riga = {
      famiglia_id: parseInt(f.famiglia_id.value, 10),
      tipo: f.tipo.value,
      data: f.data.value,
      importo: parseFloat(f.importo.value),
      metodo: f.tipo.value === "pagamento" && f.metodo.value ? f.metodo.value : null,
      note: f.note.value || null,
    };
    const q = modAnticipo
      ? supabase.from("anticipi_gasolio").update(riga).eq("id", modAnticipo.id)
      : supabase.from("anticipi_gasolio").insert(riga);
    await esegui(q, () => setModAnticipo(null));
  }

  // Estratto conto: costi dai consumi (automatici) + movimenti registrati, con saldo progressivo
  function estrattoConto(famId) {
    const righe = [];
    for (const p of periodi) {
      if (contiDal && p.da < contiDal) continue; // periodi gia' addebitati altrove
      const unitaFam = p.righe.filter((r) => r.unita.famiglia_id === famId);
      if (unitaFam.length === 0) continue;
      let tot = 0;
      let ok = false;
      let definitivo = false;
      const parti = [];
      for (const r of unitaFam) {
        const sv = defSalvato(p, r.unita.id);
        if (sv) {
          tot += Number(sv.importo);
          ok = true;
          definitivo = true;
          parti.push(`${r.unita.nome}: ${fmt(sv.importo)} € (definitivo; calcolato ${fmt(r.totale)} €)`);
        } else if (r.totale !== null) {
          tot += r.totale;
          ok = true;
          parti.push(`${r.unita.nome}: riscaldamento ${fmt(r.riscaldamento)} + acqua ${fmt(r.acqua)} (calcolato)`);
        }
      }
      if (!ok) continue;
      righe.push({
        chiave: "p" + p.da + p.a,
        data: p.a,
        tipo: "consumi",
        importo: -tot,
        descrizione: `Riscaldamento e acqua calda ${dmy(p.da)} → ${dmy(p.a)}`,
        dettaglio: parti.join(" · "),
        definitivo,
      });
    }
    for (const m of anticipi.filter((x) => x.famiglia_id === famId)) {
      righe.push({
        chiave: "m" + m.id,
        data: String(m.data).slice(0, 10),
        tipo: m.tipo,
        importo: m.tipo === "pagamento" ? Number(m.importo) : -Number(m.importo),
        descrizione:
          (m.tipo === "pagamento" ? "Pagamento ricevuto" + (m.metodo ? " (" + m.metodo + ")" : "") : "Costo aggiuntivo / rettifica"),
        dettaglio: m.note || "",
        movimento: m,
      });
    }
    righe.sort((x, y) => x.data.localeCompare(y.data) || x.chiave.localeCompare(y.chiave));
    let saldo = 0;
    for (const r of righe) {
      saldo += r.importo;
      r.saldo = saldo;
    }
    return righe;
  }

  // Le Four (casa dei genitori): costi dai consumi meno il gasolio pagato da M&P
  function estrattoLeFour(tutto = false) {
    const lf = unita.find((u) => u.nome === "Le Four");
    const righe = [];
    if (!lf) return righe;
    for (const p of periodi) {
      const storico = !!(contiDal && p.da < contiDal);
      if (storico && !tutto) continue;
      const r = p.righe.find((x) => x.unita.id === lf.id);
      if (!r) continue;
      const sv = defSalvato(p, lf.id);
      const tot = sv ? Number(sv.importo) : r.totale;
      if (tot === null || tot === undefined) continue;
      righe.push({
        chiave: "p" + p.da + p.a,
        data: p.a,
        tipo: "consumi",
        importo: -tot,
        descrizione: `Riscaldamento e acqua calda ${dmy(p.da)} → ${dmy(p.a)}`,
        dettaglio: sv ? `definitivo; calcolato ${fmt(r.totale)} €` : `riscaldamento ${fmt(r.riscaldamento)} + acqua ${fmt(r.acqua)} (calcolato)`,
        definitivo: !!sv,
        storico,
      });
    }
    for (const a of acquisti) {
      if (String(a.pagato_da || "").replace(/\s/g, "").toUpperCase() !== "M&P") continue;
      const d = String(a.data).slice(0, 10);
      const storicoA = !!(contiDal && d < contiDal);
      if (storicoA && !tutto) continue;
      righe.push({
        chiave: "a" + a.id,
        storico: storicoA,
        data: d,
        tipo: "gasolio",
        importo: Number(a.costo),
        descrizione: `Gasolio pagato da M&P: ${fmt(a.litri, 0)} l`,
        dettaglio: [a.fornitore, a.note].filter(Boolean).join(" · "),
      });
    }
    righe.sort((x, y) => x.data.localeCompare(y.data) || x.chiave.localeCompare(y.chiave));
    let saldo = 0;
    for (const r of righe) {
      saldo += r.importo;
      r.saldo = saldo;
    }
    return righe;
  }

  const COL_LEFOUR = "#1565c0";
  // credito/debito di Le Four maturato prima di "Conti dal": tenuto in memoria ma non incluso nel saldo
  const lefourStorico = estrattoLeFour(true)
    .filter((r) => r.storico)
    .reduce((somma, r) => somma + r.importo, 0);
  const haStoricoLeFour = estrattoLeFour(true).some((r) => r.storico);
  const famAttiva = famSel || famiglie[0]?.id;
  const righeEstratto = famAttiva === "lefour" ? estrattoLeFour() : estrattoConto(famAttiva);
  const schedaSaldi = (
    <>
      <p className="muted">
        Per ogni famiglia: costi dai consumi (calcolati dalle letture), pagamenti ricevuti e costi aggiuntivi. Saldo = pagamenti
        meno costi. Rosso = da versare, verde = credito.
      </p>
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
        {famiglie.map((f) => {
          const saldo = (estrattoConto(f.id).slice(-1)[0] || { saldo: 0 }).saldo;
          return (
            <div
              key={f.id}
              className="card"
              style={{ borderLeft: "4px solid " + (saldo < 0 ? "#b3261e" : "#2e7d32"), cursor: "pointer" }}
              onClick={() => setFamSel(f.id)}
            >
              <h2 style={{ marginTop: 0 }}>{f.nome}</h2>
              <p style={{ margin: 0, fontWeight: 600, color: saldo < 0 ? "#b3261e" : "#2e7d32" }}>
                {saldo < 0 ? "Da versare " : "Credito "} {fmt(Math.abs(saldo))} €
              </p>
            </div>
          );
        })}
        {unita.some((u) => u.nome === "Le Four") &&
          (() => {
            const saldo = (estrattoLeFour().slice(-1)[0] || { saldo: 0 }).saldo;
            return (
              <div
                className="card"
                style={{ borderLeft: "4px solid " + COL_LEFOUR, background: "#eef4fc", cursor: "pointer" }}
                onClick={() => setFamSel("lefour")}
              >
                <h2 style={{ marginTop: 0, color: COL_LEFOUR }}>Le Four</h2>
                <p style={{ margin: 0, fontWeight: 600, color: saldo < 0 ? "#b3261e" : "#2e7d32" }}>
                  {saldo < 0 ? "Da versare " : "Credito "} {fmt(Math.abs(saldo))} €
                </p>
                <p className="muted" style={{ margin: "0.2rem 0 0", fontSize: "0.85em" }}>
                  consumi meno il gasolio pagato da M&amp;P, dal {dmy(contiDal)}
                </p>
                {haStoricoLeFour && (
                  <p className="muted" style={{ margin: "0.2rem 0 0", fontSize: "0.85em" }}>
                    In memoria, prima di quella data: {lefourStorico < 0 ? "da versare " : "credito "}
                    {fmt(Math.abs(lefourStorico))} € (non incluso nel saldo)
                  </p>
                )}
              </div>
            );
          })()}
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{modAnticipo ? "Modifica movimento" : "Nuovo movimento"}</h2>
        <form onSubmit={salvaMovimento} key={modAnticipo ? modAnticipo.id : "nuovo"}>
          <label>
            Famiglia
            <select name="famiglia_id" defaultValue={modAnticipo?.famiglia_id || famAttiva}>
              {famiglie.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select name="tipo" defaultValue={modAnticipo?.tipo || "pagamento"}>
              <option value="pagamento">Pagamento ricevuto</option>
              <option value="costo">Costo aggiuntivo / rettifica</option>
            </select>
          </label>
          <label>
            Data
            <input type="date" name="data" defaultValue={modAnticipo?.data || oggi()} required />
          </label>
          <label>
            Importo (€)
            <input type="number" step="0.01" name="importo" defaultValue={modAnticipo?.importo || ""} required />
          </label>
          <label>
            Metodo (per i pagamenti)
            <select name="metodo" defaultValue={modAnticipo?.metodo || ""}>
              <option value="">—</option>
              <option value="bonifico">Bonifico</option>
              <option value="contanti">Contanti</option>
            </select>
          </label>
          <label>
            Note
            <textarea name="note" defaultValue={modAnticipo?.note || ""}></textarea>
          </label>
          <button type="submit" className="btn">
            Salva
          </button>{" "}
          {modAnticipo && (
            <button type="button" className="btn btn-light" onClick={() => setModAnticipo(null)}>
              Annulla
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Estratto conto</h2>
        <p style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {famiglie.map((f) => (
            <button
              key={f.id}
              type="button"
              className={famAttiva === f.id ? "btn" : "btn btn-light"}
              style={{ padding: "0.3rem 0.8rem" }}
              onClick={() => setFamSel(f.id)}
            >
              {f.nome}
            </button>
          ))}
          {unita.some((u) => u.nome === "Le Four") && (
            <button
              type="button"
              className={famAttiva === "lefour" ? "btn" : "btn btn-light"}
              style={{
                padding: "0.3rem 0.8rem",
                ...(famAttiva === "lefour" ? { background: COL_LEFOUR } : { borderColor: COL_LEFOUR, color: COL_LEFOUR }),
              }}
              onClick={() => setFamSel("lefour")}
            >
              Le Four
            </button>
          )}
        </p>
        {famAttiva === "lefour" && haStoricoLeFour && (
          <p className="muted" style={{ borderLeft: "3px solid " + COL_LEFOUR, paddingLeft: "0.6rem" }}>
            Prima del {dmy(contiDal)} (tenuto in memoria, non incluso nel saldo): {lefourStorico < 0 ? "da versare " : "credito "}
            {fmt(Math.abs(lefourStorico))} €.
          </p>
        )}
        {righeEstratto.length === 0 && <p className="muted">Nessun movimento.</p>}
        {[...righeEstratto].reverse().map((r) => (
          <div
            key={r.chiave}
            className="richiesta-item"
            style={famAttiva === "lefour" ? { borderLeft: "3px solid " + COL_LEFOUR, paddingLeft: "0.6rem" } : undefined}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <span>
                <strong>{dmy(r.data)}</strong> &mdash; {r.descrizione}
                {r.movimento && (
                  <span style={{ marginLeft: "0.4rem", whiteSpace: "nowrap" }}>
                    <Matita
                      onClick={() => {
                        setModAnticipo(r.movimento);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                    <Cestino
                      onClick={() => {
                        if (window.confirm("Eliminare questo movimento?"))
                          esegui(supabase.from("anticipi_gasolio").delete().eq("id", r.movimento.id));
                      }}
                    />
                  </span>
                )}
              </span>
              <span style={{ textAlign: "right" }}>
                <strong style={{ color: r.importo < 0 ? "#b3261e" : "#2e7d32" }}>
                  {r.importo < 0 ? "−" : "+"}
                  {fmt(Math.abs(r.importo))} €
                </strong>
                <br />
                <span className="muted" style={{ fontSize: "0.85em" }}>
                  saldo {fmt(r.saldo)} €
                </span>
              </span>
            </div>
            {r.dettaglio && <p className="descrizione" style={{ margin: "0.15rem 0 0" }}>{r.dettaglio}</p>}
            {(r.tipo === "consumi" || r.tipo === "gasolio") && (
              <p className="muted" style={{ fontSize: "0.8em", margin: "0.15rem 0 0" }}>
                {r.tipo === "gasolio" ? "pagamento del gasolio" : r.definitivo ? "importo definitivo deciso da te" : "calcolato dalle letture"}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );

  // ---------- Impostazioni ----------
  async function salvaTariffa(e) {
    e.preventDefault();
    const f = e.target;
    const n = (v) => (v === "" ? null : parseFloat(v));
    const riga = {
      valida_dal: f.valida_dal.value,
      eur_mwh: n(f.eur_mwh.value),
      eur_m3: n(f.eur_m3.value),
      eur_l_condomini: n(f.eur_l_condomini.value),
      eur_l_residenti: n(f.eur_l_residenti.value),
      prezzo_rif_l: n(f.prezzo_rif_l.value) || 1.45,
    };
    const q = modTariffa
      ? supabase.from("tariffe_gasolio").update(riga).eq("id", modTariffa.id)
      : supabase.from("tariffe_gasolio").insert(riga);
    await esegui(q, () => setModTariffa(null));
  }
  async function nuovoContatore(e) {
    e.preventDefault();
    const f = e.target;
    const ok = await esegui(
      supabase.from("contatori").insert({
        nome: f.nome.value,
        tipo: f.tipo.value,
        misura: f.misura.value || "",
        unita_id: f.unita_id.value ? parseInt(f.unita_id.value, 10) : null,
        ordine: contatori.length + 1,
      })
    );
    if (ok) f.reset();
  }
  const schedaImpostazioni = (
    <>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Prezzo del gasolio nei conti</h2>
        <p className="muted">
          I periodi che iniziano prima di questa data usano le tariffe di riferimento, senza ponderazione (sono i dati già
          addebitati). Dopo, il costo si pondera sul gasolio effettivamente bruciato: si consuma prima quello più vecchio
          (si usano i litri letti sul contatore della caldaia e gli acquisti in ordine di data).
        </p>
        <label>
          Ponderazione sul gasolio dal
          <input
            type="date"
            defaultValue={ponderazioneDal}
            onBlur={(e) => {
              if (e.target.value && e.target.value !== ponderazioneDal)
                esegui(supabase.from("impostazioni_gasolio").upsert({ chiave: "ponderazione_dal", valore: e.target.value }, { onConflict: "chiave" }));
            }}
          />
        </label>
        <label>
          Litri già nel serbatoio quando il contatore caldaia era a zero
          <input
            type="number"
            step="any"
            defaultValue={offsetLitri}
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 0;
              if (v !== offsetLitri)
                esegui(supabase.from("impostazioni_gasolio").upsert({ chiave: "offset_litri", valore: String(v) }, { onConflict: "chiave" }));
            }}
          />
        </label>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Inizio dei conti</h2>
        <p className="muted">
          I periodi di lettura che iniziano prima di questa data non entrano nel saldo delle famiglie (sono già stati
          addebitati nelle spese).
        </p>
        <label>
          Conti dal
          <input
            type="date"
            defaultValue={contiDal}
            onBlur={(e) => {
              if (e.target.value && e.target.value !== contiDal)
                esegui(
                  supabase.from("impostazioni_gasolio").upsert({ chiave: "conti_dal", valore: e.target.value }, { onConflict: "chiave" })
                );
            }}
          />
        </label>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Tariffe</h2>
        <p className="muted">
          Valgono dalla data indicata fino alla tariffa successiva. Un periodo usa la tariffa in vigore alla data della
          lettura finale.
        </p>
        {tariffe.map((t) => (
          <div key={t.id} className="richiesta-item">
            <strong>dal {dmy(t.valida_dal)}</strong> &mdash; {fmt(t.eur_mwh)} €/MWh · {fmt(t.eur_m3)} €/m³ · gasolio rif. {fmt(t.prezzo_rif_l || 1.45)} €/l
            {t.eur_l_condomini ? ` · ${fmt(t.eur_l_condomini)} €/l condomini` : ""}
            {t.eur_l_residenti ? ` · ${fmt(t.eur_l_residenti)} €/l residenti` : ""}
            <span style={{ marginLeft: "0.5rem" }}>
              <Matita onClick={() => setModTariffa(t)} />
              <Cestino
                onClick={() => {
                  if (window.confirm("Eliminare questa tariffa?")) esegui(supabase.from("tariffe_gasolio").delete().eq("id", t.id));
                }}
              />
            </span>
          </div>
        ))}
        <form onSubmit={salvaTariffa} key={modTariffa ? modTariffa.id : "nuova"} style={{ marginTop: "0.75rem" }}>
          <strong>{modTariffa ? "Modifica tariffa" : "Nuova tariffa"}</strong>
          <label>
            Valida dal
            <input type="date" name="valida_dal" defaultValue={modTariffa?.valida_dal || oggi()} required />
          </label>
          <label>
            Prezzo del gasolio di riferimento (€/l)
            <input type="number" step="any" name="prezzo_rif_l" defaultValue={modTariffa?.prezzo_rif_l || 1.45} required />
          </label>
          <label>
            €/MWh (calore contabilizzato, rendimento 91%)
            <input type="number" step="any" name="eur_mwh" defaultValue={modTariffa?.eur_mwh || ""} required />
          </label>
          <label>
            €/m³ acqua calda sanitaria (rendimento 100%)
            <input type="number" step="any" name="eur_m3" defaultValue={modTariffa?.eur_m3 || ""} required />
          </label>
          <label>
            €/l gasolio (condomini)
            <input type="number" step="any" name="eur_l_condomini" defaultValue={modTariffa?.eur_l_condomini || ""} />
          </label>
          <label>
            €/l gasolio (residenti)
            <input type="number" step="any" name="eur_l_residenti" defaultValue={modTariffa?.eur_l_residenti || ""} />
          </label>
          <button type="submit" className="btn">
            Salva
          </button>{" "}
          {modTariffa && (
            <button type="button" className="btn btn-light" onClick={() => setModTariffa(null)}>
              Annulla
            </button>
          )}
        </form>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Unità</h2>
        <p className="muted">
          Peso: Le Four conta all&apos;80% nella ripartizione. &quot;In ripartizione&quot; = riceve una quota del costo
          generale. La famiglia indica a chi addebitare.
        </p>
        {unita.map((u) => (
          <div key={u.id} className="richiesta-item" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ minWidth: "8rem" }}>{u.nome}</strong>
            <label style={{ margin: 0, fontWeight: 400 }}>
              Peso{" "}
              <input
                type="number"
                step="0.05"
                defaultValue={u.peso}
                style={{ width: "5rem", marginBottom: 0 }}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v > 0 && v !== Number(u.peso)) esegui(supabase.from("unita_consumo").update({ peso: v }).eq("id", u.id));
                }}
              />
            </label>
            <label style={{ margin: 0, fontWeight: 400, display: "flex", gap: "0.3rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={u.ripartizione}
                style={{ width: "auto", marginBottom: 0 }}
                onChange={(e) => esegui(supabase.from("unita_consumo").update({ ripartizione: e.target.checked }).eq("id", u.id))}
              />
              In ripartizione
            </label>
            <select
              value={u.prezzo_gasolio || "pieno"}
              style={{ width: "auto", marginBottom: 0 }}
              onChange={(e) => esegui(supabase.from("unita_consumo").update({ prezzo_gasolio: e.target.value }).eq("id", u.id))}
            >
              <option value="pieno">Gasolio a prezzo pieno</option>
              <option value="scontato">Gasolio scontato</option>
            </select>
            <select
              value={u.famiglia_id || ""}
              style={{ width: "auto", marginBottom: 0 }}
              onChange={(e) =>
                esegui(supabase.from("unita_consumo").update({ famiglia_id: e.target.value ? parseInt(e.target.value, 10) : null }).eq("id", u.id))
              }
            >
              <option value="">Nessuna famiglia</option>
              {famiglie.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Contatori</h2>
        {contatori.map((c) => (
          <div key={c.id} className="richiesta-item" style={{ opacity: c.attivo ? 1 : 0.5 }}>
            <strong>{c.nome}</strong>{" "}
            <span className="muted">
              {TIPI_CONTATORE.find((t) => t[0] === c.tipo)?.[1]} · {unita.find((u) => u.id === c.unita_id)?.nome || "senza unità"}
            </span>
            <span style={{ marginLeft: "0.5rem" }}>
              <label style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", margin: 0, fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={c.attivo}
                  style={{ width: "auto", marginBottom: 0 }}
                  onChange={(e) => esegui(supabase.from("contatori").update({ attivo: e.target.checked }).eq("id", c.id))}
                />
                attivo
              </label>
              <Cestino
                onClick={() => {
                  if (window.confirm("Eliminare il contatore e tutte le sue letture?"))
                    esegui(supabase.from("contatori").delete().eq("id", c.id));
                }}
              />
            </span>
          </div>
        ))}
        <form onSubmit={nuovoContatore} style={{ marginTop: "0.75rem" }}>
          <strong>Nuovo contatore</strong>
          <label>
            Nome
            <input name="nome" required />
          </label>
          <label>
            Tipo
            <select name="tipo">
              {TIPI_CONTATORE.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Unità di misura
            <input name="misura" placeholder="MWh, m3, l" />
          </label>
          <label>
            Unità
            <select name="unita_id">
              <option value="">Nessuna</option>
              {unita.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn">
            Aggiungi
          </button>
        </form>
      </div>
    </>
  );

  return (
    <main>
      <h1>Gasolio e letture</h1>
      <p style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {SCHEDE.map(([v, l]) => (
          <button
            key={v}
            type="button"
            className={scheda === v ? "btn" : "btn btn-light"}
            style={{ padding: "0.35rem 0.9rem" }}
            onClick={() => setScheda(v)}
          >
            {l}
          </button>
        ))}
      </p>
      {msg && <p style={{ color: "#a33" }}>{msg}</p>}
      {scheda === "conti" && schedaConti}
      {scheda === "letture" && schedaLetture}
      {scheda === "acquisti" && schedaAcquisti}
      {scheda === "saldi" && schedaSaldi}
      {scheda === "impostazioni" && schedaImpostazioni}
    </main>
  );
}
