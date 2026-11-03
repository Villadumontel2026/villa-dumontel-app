"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "./AppProvider";
import SelettoreNumero from "./SelettoreNumero";

const CHECKLIST_PULIZIE = [
  "Cambio lenzuola",
  "Cambio asciugamani",
  "Pulizia bagni",
  "Pulizia cucina",
  "Pulizia terrazzo/balcone",
  "Riordino generale",
];

// Tappe del servizio aeroporto: navetta Aosta - Malpensa, con bus Courmayeur - Aosta
const TAPPE = ["Courmayeur", "Aosta", "Malpensa T1", "Malpensa T2"];
const e_malpensa = (x) => String(x || "").startsWith("Malpensa");

const ALTRO = "__altro__";

// Fasce orarie dei pasti (minuti dalla mezzanotte)
const PRANZO = [11 * 60, 15 * 60];
const CENA = [18 * 60, 24 * 60];

function minuti(ora) {
  if (!ora) return null;
  const [h, m] = String(ora).split(":");
  return parseInt(h, 10) * 60 + parseInt(m || "0", 10);
}

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
//  collaboratori: se presente e' il form dell'admin (puo' indicare il tipo di pulizia)
//  onSubmit(valori) -> Promise che ritorna un messaggio di errore oppure null
//  etichettaBottone
export default function FormRichiesta({
  alloggi,
  posti = [],
  collaboratori = null,
  tipoIniziale = "ristorante",
  soloTipo = false,
  nomeIniziale = "",
  onSubmit,
  etichettaBottone = "Invia richiesta",
}) {
  const { t, task, lang } = useApp();
  const [tipo, setTipo] = useState(tipoIniziale);
  const postiTipo = (tp) => posti.filter((p) => p.categoria === tp);

  const trovaIniziale = (tp) => {
    if (!nomeIniziale || tp !== tipoIniziale) return "";
    const p = postiTipo(tp).find((x) => x.nome === nomeIniziale);
    if (p) return String(p.id);
    return nomeIniziale ? ALTRO : "";
  };

  const [posto, setPosto] = useState(trovaIniziale(tipoIniziale));
  const [tipologia, setTipologia] = useState("aeroporto");
  const [aeroDa, setAeroDa] = useState("Aosta");
  const [aeroA, setAeroA] = useState("Malpensa T1");
  const [errore, setErrore] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const isAdmin = !!collaboratori;

  // Nome prenotazione: si ricorda l'ultimo usato su questo dispositivo
  const [nomeRicordato, setNomeRicordato] = useState("");
  useEffect(() => {
    try {
      setNomeRicordato(window.localStorage.getItem("vd_nome_prenotazione") || "");
    } catch (e) {}
  }, []);

  // Pulizie (admin): se la data coincide con la fine di un soggiorno suggerisco "fine soggiorno"
  const [finiSoggiorno, setFiniSoggiorno] = useState([]);
  const [pulAlloggio, setPulAlloggio] = useState(alloggi && alloggi[0] ? String(alloggi[0].id) : "");
  const [pulData, setPulData] = useState("");
  const [pulTipo, setPulTipo] = useState("");
  const [pulTocco, setPulTocco] = useState(false);
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("eventi")
      .select("per_famiglia_id, tipo_evento, data_inizio, data_fine")
      .in("tipo_evento", ["partenza", "arrivo"])
      .then(({ data }) => {
        const out = [];
        (data || []).forEach((e) => {
          if (e.tipo_evento === "partenza") out.push({ fam: e.per_famiglia_id, data: e.data_inizio });
          else if (e.data_fine) out.push({ fam: e.per_famiglia_id, data: e.data_fine });
        });
        setFiniSoggiorno(out);
      });
  }, [isAdmin]);
  const suggerisceFine = (() => {
    const idA = pulAlloggio || (alloggi && alloggi[0] ? String(alloggi[0].id) : "");
    const a = (alloggi || []).find((x) => String(x.id) === String(idA));
    return !!(a && pulData && finiSoggiorno.some((f) => String(f.fam) === String(a.famiglia_id) && f.data === pulData));
  })();
  useEffect(() => {
    if (!pulTocco) setPulTipo(suggerisceFine ? "fine_soggiorno" : "");
  }, [suggerisceFine, pulTocco]);

  // Courmayeur non ha corsa diretta per Malpensa: avviso con pop-up
  function cambiaTappa(lato, valore) {
    const nuovoDa = lato === "da" ? valore : aeroDa;
    const nuovoA = lato === "a" ? valore : aeroA;
    if (lato === "da") setAeroDa(valore);
    else setAeroA(valore);
    if ((nuovoDa === "Courmayeur" || nuovoA === "Courmayeur") && (e_malpensa(nuovoDa) || e_malpensa(nuovoA))) {
      window.alert(t("f.avvisoCambio"));
    }
  }

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
    let tipologia_trasporto = null;
    let orario_tipo = null;

    if (tipo === "trasporto") {
      tipologia_trasporto = tipologia;
      orario_tipo = val("orario_tipo") || "partenza";
      if (tipologia === "aeroporto") {
        const da = aeroDa === ALTRO ? (val("aero_da_altro") || "").trim() : aeroDa;
        const a = aeroA === ALTRO ? (val("aero_a_altro") || "").trim() : aeroA;
        if (!da || !a || da === a) {
          setErrore(t("f.errTratta"));
          return;
        }
        if (!e_malpensa(da) && !e_malpensa(a)) {
          setErrore(t("f.errAeroporto"));
          return;
        }
        sotto_tipo = `${da} → ${a}`;
        if (da === "Courmayeur" || a === "Courmayeur") descrizione = t("f.noteCambio");
      } else {
        sotto_tipo = `${(val("da_luogo") || "").trim()} → ${(val("a_luogo") || "").trim()}`;
      }
    } else if (tipo === "ristorante" || tipo === "attivita") {
      if (posto === ALTRO || !posto) {
        descrizione = val("altro_testo");
      } else {
        const p = posti.find((x) => String(x.id) === String(posto));
        posto_id = p ? p.id : null;
        descrizione = p ? p.nome : null;
      }
      if (!descrizione) {
        setErrore(t(tipo === "ristorante" ? "f.errRistorante" : "f.errAttivita"));
        return;
      }
    } else if (tipo === "pulizie") {
      sotto_tipo = isAdmin ? val("tipo_pulizia") : null;
      const voci = Array.from(
        f.querySelectorAll('input[name="voci"]:checked')
      ).map((c) => c.value);
      descrizione = voci.length ? voci.join(", ") : null;
    }

    // Controlli sui campi obbligatori
    if (tipo !== "pulizie") {
      if (!val("data") || !val("ora") || !val("pax")) {
        setErrore(t("f.errObbligatori"));
        return;
      }
    }

    // Avviso (non bloccante) sull'orario di pranzo/cena
    if (tipo === "ristorante") {
      const m = minuti(val("ora"));
      const pasto = sotto_tipo === "cena" ? "cena" : "pranzo";
      const [a, b] = pasto === "cena" ? CENA : PRANZO;
      if (m !== null && (m < a || m >= b)) {
        const ok = window.confirm(
          t(pasto === "cena" ? "f.avvisoCena" : "f.avvisoPranzo").replace("{ora}", val("ora"))
        );
        if (!ok) return;
      }
    }

    const nomeP = (val("nome_prenotazione") || "").trim();
    if (nomeP && tipo !== "pulizie") {
      try {
        window.localStorage.setItem("vd_nome_prenotazione", nomeP);
      } catch (e) {}
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
      nome_prenotazione: tipo === "pulizie" ? null : (val("nome_prenotazione") || "").trim() || null,
      tipologia_trasporto,
      orario_tipo,
    });

    if (err) {
      setErrore(err);
    } else {
      f.reset();
      setPosto("");
      setAeroDa("Aosta");
      setAeroA("Malpensa T1");
      setTipologia("aeroporto");
      setFormKey((k) => k + 1);
    }
  }

  function selezionePosto(tp, etichetta) {
    const gruppi = raggruppa(postiTipo(tp));
    return (
      <>
        <label>
          {etichetta}
          <select value={posto} onChange={(e) => setPosto(e.target.value)} required>
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

  const campoNome = (
    <label>
      {t("f.nomePrenotazione")}
      <input
        type="text"
        name="nome_prenotazione"
        key={"np" + nomeRicordato}
        defaultValue={nomeRicordato}
        required
        placeholder={t("f.nomePrenotazioneHint")}
      />
    </label>
  );

  return (
    <form onSubmit={invia} key={formKey}>
      {errore && <p style={{ color: "#a32d2d" }}>{errore}</p>}

      {!soloTipo && (
      <label>
        {t("f.cosa")}
        <select value={tipo} onChange={(e) => cambiaTipo(e.target.value)}>
          <option value="ristorante">{t("tipo.ristorante")}</option>
          <option value="attivita">{t("tipo.attivita")}</option>
          <option value="trasporto">{t("tipo.trasporto")}</option>
          <option value="pulizie">{t("tipo.pulizie")}</option>
        </select>
      </label>
      )}

      <label>
        {t("f.alloggio")}
        <select name="alloggio_id" required onChange={(e) => setPulAlloggio(e.target.value)}>
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
            {t("f.tipologia")}
            <select value={tipologia} onChange={(e) => setTipologia(e.target.value)} required>
              <option value="aeroporto">{t("f.tipAeroporto")}</option>
              <option value="transfer">{t("f.tipTransfer")}</option>
            </select>
          </label>

          {tipologia === "aeroporto" && (
            <>
              <label>
                {t("f.partenzaDa")}
                <select value={aeroDa} onChange={(e) => cambiaTappa("da", e.target.value)} required>
                  {TAPPE.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value={ALTRO}>{t("c.altro")}</option>
                </select>
              </label>
              {aeroDa === ALTRO && (
                <label>
                  {t("f.indicaQuale")}
                  <input type="text" name="aero_da_altro" required />
                </label>
              )}
              <label>
                {t("f.arrivoA")}
                <select value={aeroA} onChange={(e) => cambiaTappa("a", e.target.value)} required>
                  {TAPPE.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value={ALTRO}>{t("c.altro")}</option>
                </select>
              </label>
              {aeroA === ALTRO && (
                <label>
                  {t("f.indicaQuale")}
                  <input type="text" name="aero_a_altro" required />
                </label>
              )}
              {(aeroDa === "Courmayeur" || aeroA === "Courmayeur") && (
                <p style={{ background: "#fff6e0", borderRadius: 8, padding: "0.5rem 0.7rem", margin: "0 0 0.8rem" }}>
                  {t("f.avvisoCambio")}
                </p>
              )}
            </>
          )}

          {tipologia === "transfer" && (
            <>
              <label>
                {t("f.da")}
                <input type="text" name="da_luogo" required />
              </label>
              <label>
                {t("f.a")}
                <input type="text" name="a_luogo" required />
              </label>
            </>
          )}

          <label>
            {t("f.data")}
            <input type="date" name="data" required />
          </label>
          <label>
            {t("f.orarioDi")}
            <select name="orario_tipo" defaultValue="partenza" required>
              <option value="partenza">{t("f.oraPartenza")}</option>
              <option value="arrivo">{t("f.oraArrivo")}</option>
            </select>
          </label>
          <label>
            {t("f.ora")}
            <input type="time" name="ora" required />
          </label>
          <label>
            {t("f.passeggeri")}
            <SelettoreNumero name="pax" min={1} max={20} required vuoto={t("f.scegliNumero")} />
          </label>
          {campoNome}
        </>
      )}

      {tipo === "ristorante" && (
        <>
          {selezionePosto("ristorante", t("f.ristorante"))}
          <label>
            {t("f.pasto")}
            <select name="sotto_tipo" required>
              <option value="pranzo">{t("sotto.pranzo")}</option>
              <option value="cena">{t("sotto.cena")}</option>
            </select>
          </label>
          <label>
            {t("f.data")}
            <input type="date" name="data" required />
          </label>
          <label>
            {t("f.ora")}
            <input type="time" name="ora" required />
          </label>
          <label>
            {t("f.persone")}
            <SelettoreNumero name="pax" min={1} max={20} required vuoto={t("f.scegliNumero")} />
          </label>
          {campoNome}
        </>
      )}

      {tipo === "attivita" && (
        <>
          {selezionePosto("attivita", t("f.attivita"))}
          <label>
            {t("f.data")}
            <input type="date" name="data" required />
          </label>
          <label>
            {t("f.ora")}
            <input type="time" name="ora" required />
          </label>
          <label>
            {t("f.partecipanti")}
            <SelettoreNumero name="pax" min={1} max={20} required vuoto={t("f.scegliNumero")} />
          </label>
          {campoNome}
        </>
      )}

      {tipo === "pulizie" && (
        <>
          {isAdmin && (
            <label>
              {t("f.tipoPulizia")}
              <select
                name="tipo_pulizia"
                value={pulTipo}
                onChange={(e) => {
                  setPulTocco(true);
                  setPulTipo(e.target.value);
                }}
              >
                <option value="">{t("f.pulDaIndicare")}</option>
                <option value="periodica">{t("f.pulPeriodica")}</option>
                <option value="fine_soggiorno">{t("f.pulFine")}</option>
              </select>
              {suggerisceFine && !pulTocco && (
                <span className="muted" style={{ fontSize: "0.85em" }}>
                  {t("f.suggFine")}
                </span>
              )}
            </label>
          )}
          <label>
            {t("f.dataDesiderata")}
            <input type="date" name="data" required onChange={(e) => setPulData(e.target.value)} />
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
            <SelettoreNumero name="durata_ore" min={0.5} max={12} passo={0.5} defaultValue="3" required suffisso=" h" />
          </label>
          <label>{t("f.cosaServe")}</label>
          {task.map((tk) => tk.nome_it).map((voce) => (
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
              {lang === "en" ? (task.find((x) => x.nome_it === voce)?.nome_en || voce) : voce}
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
