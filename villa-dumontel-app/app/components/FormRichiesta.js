"use client";

import { useState } from "react";
import { useApp } from "./AppProvider";

const CHECKLIST_PULIZIE = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

const DIREZIONI = [
  "Malpensa T1 → Courmayeur",
  "Malpensa T2 → Courmayeur",
  "Courmayeur → Malpensa T1",
  "Courmayeur → Malpensa T2",
];

const ALTRO = "__altro__";

function raggruppa(posti) {
  const g = {};
  posti.forEach((p) => {
    const k = p.sotto_categoria || "Altro";
    if (!g[k]) g[k] = [];
    g[k].push(p);
  });
  return g;
}

// Props:
//  alloggi, posti [{id, nome, categoria, sotto_categoria}]
//  tipoIniziale, nomeIniziale (per i pulsanti "Prenota" delle pagine Info)
//  onSubmit(valori) -> Promise che ritorna un messaggio di errore oppure null
//  etichettaBottone
export default function FormRichiesta({
  alloggi,
  posti = [],
  collaboratori = null,
  tipoIniziale = "ristorante",
  nomeIniziale = "",
  onSubmit,
  etichettaBottone = "Invia richiesta",
}) {
  const { t } = useApp();
  const [tipo, setTipo] = useState(tipoIniziale);
  const postiTipo = (tp) => posti.filter((p) => p.categoria === tp);

  const trovaIniziale = (tp) => {
    if (!nomeIniziale || tp !== tipoIniziale) return "";
    const p = postiTipo(tp).find((x) => x.nome === nomeIniziale);
    if (p) return String(p.id);
    return nomeIniziale ? ALTRO : "";
  };

  const [posto, setPosto] = useState(trovaIniziale(tipoIniziale));
  const [direzione, setDirezione] = useState(DIREZIONI[0]);
  const [errore, setErrore] = useState(null);
  const [formKey, setFormKey] = useState(0);

  function cambiaTipo(tp) {
    setTipo(tp);
    setPosto(trovaIniziale(tp));
    setErrore(null);
  }

  async function invia(e) {
    e.preventDefault();
    setErrore(null);
    const f = e.target;
    const val = (n) => (f[n] && f[n].value ? f[n].value : null);

    let sotto_tipo = val("sotto_tipo");
    let descrizione = null;
    let posto_id = null;

    if (tipo === "trasporto") {
      if (direzione === ALTRO) {
        sotto_tipo = "Altro";
        descrizione = val("altro_testo");
      } else {
        sotto_tipo = direzione;
      }
    } else if (tipo === "ristorante" || tipo === "attivita") {
      if (posto === ALTRO || !posto) {
        descrizione = val("altro_testo");
      } else {
        const p = posti.find((x) => String(x.id) === String(posto));
        posto_id = p ? p.id : null;
        descrizione = p ? p.nome : null;
      }
    } else if (tipo === "pulizie") {
      const voci = Array.from(
        f.querySelectorAll('input[name="voci"]:checked')
      ).map((c) => c.value);
      descrizione = voci.length ? voci.join(", ") : null;
    }

    const err = await onSubmit({
      tipo,
      alloggio_id: val("alloggio_id"),
      sotto_tipo,
      data: val("data"),
      ora: val("ora"),
      pax: val("pax") ? parseInt(val("pax"), 10) : null,
      durata_ore: tipo === "pulizie" && val("durata_ore") ? parseFloat(val("durata_ore")) : null,
      collaboratore_id: tipo === "pulizie" ? val("collaboratore_id") : null,
      descrizione,
      posto_id,
      note: val("note"),
    });

    if (err) {
      setErrore(err);
    } else {
      f.reset();
      setPosto("");
      setDirezione(DIREZIONI[0]);
      setFormKey((k) => k + 1);
    }
  }

  function selezionePosto(tp, etichetta) {
    const gruppi = raggruppa(postiTipo(tp));
    return (
      <>
        <label>
          {etichetta}
          <select value={posto} onChange={(e) => setPosto(e.target.value)}>
            <option value="">{t("f.scegli")}</option>
            {Object.keys(gruppi).map((g) => (
              <optgroup key={g} label={g}>
                {gruppi[g].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={ALTRO}>{t("f.altroScrivo")}</option>
          </select>
        </label>
        {posto === ALTRO && (
          <label>
            {t("f.indicaQuale")}
            <input
              type="text"
              name="altro_testo"
              defaultValue={tipo === tipoIniziale ? nomeIniziale : ""}
              required
            />
          </label>
        )}
      </>
    );
  }

  return (
    <form onSubmit={invia} key={formKey}>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      <label>
        {t("f.cosa")}
        <select value={tipo} onChange={(e) => cambiaTipo(e.target.value)}>
          <option value="ristorante">{t("tipo.ristorante")}</option>
          <option value="attivita">{t("tipo.attivita")}</option>
          <option value="trasporto">{t("tipo.trasporto")}</option>
          <option value="pulizie">{t("tipo.pulizie")}</option>
        </select>
      </label>

      <label>
        {t("f.alloggio")}
        <select name="alloggio_id" required>
          {alloggi.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </label>

      {tipo === "trasporto" && (
        <>
          <label>
            {t("f.direzione")}
            <select
              value={direzione}
              onChange={(e) => setDirezione(e.target.value)}
            >
              {DIREZIONI.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={ALTRO}>{t("c.altro")}</option>
            </select>
          </label>
          {direzione === ALTRO && (
            <label>
              {t("f.tratta")}
              <input type="text" name="altro_testo" required />
            </label>
          )}
          <label>
            {t("f.data")}
            <input type="date" name="data" />
          </label>
          <label>
            {t("f.orarioVolo")}
            <input type="time" name="ora" />
          </label>
          <label>
            {t("f.passeggeri")}
            <input type="number" name="pax" min="1" />
          </label>
        </>
      )}

      {tipo === "ristorante" && (
        <>
          {selezionePosto("ristorante", t("f.ristorante"))}
          <label>
            {t("f.pasto")}
            <select name="sotto_tipo">
              <option value="pranzo">{t("sotto.pranzo")}</option>
              <option value="cena">{t("sotto.cena")}</option>
            </select>
          </label>
          <label>
            {t("f.data")}
            <input type="date" name="data" />
          </label>
          <label>
            {t("f.ora")}
            <input type="time" name="ora" />
          </label>
          <label>
            {t("f.persone")}
            <input type="number" name="pax" min="1" />
          </label>
        </>
      )}

      {tipo === "attivita" && (
        <>
          {selezionePosto("attivita", t("f.attivita"))}
          <label>
            {t("f.data")}
            <input type="date" name="data" />
          </label>
          <label>
            {t("f.ora")}
            <input type="time" name="ora" />
          </label>
          <label>
            {t("f.partecipanti")}
            <input type="number" name="pax" min="1" />
          </label>
        </>
      )}

      {tipo === "pulizie" && (
        <>
          <label>
            {t("f.dataDesiderata")}
            <input type="date" name="data" required />
          </label>
          <label>
            {t("f.oraInizio")}
            <input type="time" name="ora" required />
          </label>
          {collaboratori && (
            <label>
              {t("f.collab")}
              <select name="collaboratore_id" defaultValue="">
                <option value="">{t("f.daAssegnare")}</option>
                {collaboratori.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {t("f.durata")}
            <input type="number" name="durata_ore" min="0.5" max="12" step="0.5" defaultValue="3" required />
          </label>
          <label>{t("f.cosaServe")}</label>
          {CHECKLIST_PULIZIE.map((voce) => (
            <label
              key={voce}
              style={{
                fontWeight: 400,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <input
                type="checkbox"
                name="voci"
                value={voce}
                style={{ width: "auto", marginBottom: 0 }}
              />
              {t("voce." + voce)}
            </label>
          ))}
        </>
      )}

      <label>
        {t("f.note")}
        <textarea name="note"></textarea>
      </label>

      <button type="submit" className="btn">
        {etichettaBottone}
      </button>
    </form>
  );
}
