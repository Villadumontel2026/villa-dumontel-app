// Calcolo dei consumi e delle quote di riscaldamento / acqua calda per periodo (tra due letture).
// Le tariffe (EUR/MWh e EUR/m3) sono riferite a un prezzo del gasolio (di norma 1,45 EUR/l, rendimento caldaia 91%)
// e vengono proporzionate al prezzo reale del gasolio nel periodo: media ponderata degli acquisti degli ultimi 12 mesi,
// al prezzo pieno o scontato (defiscalizzazione) secondo l'unita'.
// Replica il foglio "CONTI DUMONTEL":
//  - riscaldamento: costo generale = delta MWh del contatore generale x EUR/MWh; ogni unita' ha un "teorico"
//    (delta MWh x EUR/MWh x peso, con Le Four a 0,8) e riceve la quota proporzionale del costo generale;
//  - acqua calda: delta contalitri (m3) x EUR/m3;
//  - gasolio caldaia (informativo): delta litri x EUR/l condomini.

export const arrotonda = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function valoreA(letture, contatoreId, data) {
  const l = letture.find((x) => x.contatore_id === contatoreId && String(x.data).slice(0, 10) === data);
  return l ? Number(l.valore) : null;
}

export const DEFISCALIZZAZIONE_L = 0.12256; // EUR/l, per stimare il prezzo pieno quando manca

// Prezzo medio ponderato (sui litri) degli acquisti dei 12 mesi fino a "data"
export function prezzoGasolio(acquisti, data, giorni = 365) {
  const fine = new Date(data + "T00:00:00Z").getTime();
  const inizio = fine - giorni * 86400000;
  let litri = 0;
  let pieno = 0;
  let scontato = 0;
  let stimato = false;
  for (const a of acquisti || []) {
    const t = new Date(String(a.data).slice(0, 10) + "T00:00:00Z").getTime();
    if (t > fine || t <= inizio || !Number(a.litri)) continue;
    const l = Number(a.litri);
    const sc = a.prezzo_l_scontato ? Number(a.prezzo_l_scontato) : Number(a.costo) / l;
    let pi;
    if (a.prezzo_l_pieno) pi = Number(a.prezzo_l_pieno);
    else {
      pi = sc + DEFISCALIZZAZIONE_L;
      stimato = true;
    }
    litri += l;
    pieno += pi * l;
    scontato += sc * l;
  }
  if (litri === 0) return null;
  return { pieno: pieno / litri, scontato: scontato / litri, litri, stimato };
}

// Prezzo del gasolio effettivamente bruciato tra due letture del contatore caldaia (litri cumulativi):
// si consuma prima il gasolio piu' vecchio (FIFO). Gli acquisti formano "strati" in ordine di data; la posizione
// nello strato e' data dal valore del contatore + i litri gia' presenti nel serbatoio a contatore zero (offset).
export function prezzoFifo(acquisti, m0, m1, offset = 0) {
  const lista = [...(acquisti || [])]
    .filter((a) => Number(a.litri) > 0)
    .sort((a, b) => String(a.data).localeCompare(String(b.data)) || Number(a.id || 0) - Number(b.id || 0));
  if (lista.length === 0 || m0 === null || m1 === null || m1 <= m0) return null;
  const da = m0 + offset;
  const a = m1 + offset;
  let cum = 0;
  let litri = 0;
  let pieno = 0;
  let scontato = 0;
  let stimato = false;
  let ultimo = null;
  for (const ac of lista) {
    const l = Number(ac.litri);
    const sc = ac.prezzo_l_scontato ? Number(ac.prezzo_l_scontato) : Number(ac.costo) / l;
    let pi;
    if (ac.prezzo_l_pieno) pi = Number(ac.prezzo_l_pieno);
    else {
      pi = sc + DEFISCALIZZAZIONE_L;
      stimato = true;
    }
    ultimo = { sc, pi };
    const inizio = cum;
    const fine = cum + l;
    cum = fine;
    const ov = Math.min(fine, a) - Math.max(inizio, da);
    if (ov > 0) {
      litri += ov;
      pieno += pi * ov;
      scontato += sc * ov;
    }
  }
  let oltre = false;
  if (a > cum) {
    // consumo oltre gli acquisti registrati: si usa l'ultimo prezzo
    const ov = a - Math.max(cum, da);
    if (ov > 0 && ultimo) {
      litri += ov;
      pieno += ultimo.pi * ov;
      scontato += ultimo.sc * ov;
      oltre = true;
    }
  }
  if (litri === 0) return null;
  return { pieno: pieno / litri, scontato: scontato / litri, litri, stimato, oltre, metodo: "fifo" };
}

export function tariffaPer(tariffe, data) {
  const ok = tariffe
    .filter((t) => String(t.valida_dal).slice(0, 10) <= data)
    .sort((a, b) => String(b.valida_dal).localeCompare(String(a.valida_dal)));
  return ok[0] || null;
}

// unita: [{id, nome, famiglia_id, peso, ripartizione}], contatori: [{id, unita_id, tipo, nome}], letture: [{contatore_id, data, valore}]
export function calcolaPeriodi({ unita, contatori, letture, tariffe, acquisti = [], ponderazioneDal = null, offsetLitri = 0 }) {
  const tipiConti = ["calore_generale", "calore", "contalitri", "caldaia_litri"];
  const idConti = new Set(contatori.filter((c) => tipiConti.includes(c.tipo)).map((c) => c.id));
  const date = [
    ...new Set(letture.filter((l) => idConti.has(l.contatore_id)).map((l) => String(l.data).slice(0, 10))),
  ].sort();
  const generale = contatori.find((c) => c.tipo === "calore_generale");
  const periodi = [];

  for (let i = 1; i < date.length; i++) {
    const d0 = date[i - 1];
    const d1 = date[i];
    const tar = tariffaPer(tariffe, d1);
    const delta = (c) => {
      if (!c) return null;
      const a = valoreA(letture, c.id, d0);
      const b = valoreA(letture, c.id, d1);
      return a === null || b === null ? null : b - a;
    };
    const avvisi = [];
    if (!tar) avvisi.push("Tariffe mancanti per questo periodo");

    // prezzo del gasolio nel periodo e fattore rispetto al prezzo di riferimento
    // - periodi che iniziano prima di "ponderazioneDal": tariffe di riferimento, senza ponderazione (dati storici)
    // - dopo: gasolio effettivamente bruciato (FIFO sul contatore caldaia)
    const rif = tar && tar.prezzo_rif_l ? Number(tar.prezzo_rif_l) : 1.45;
    const storico = !!(ponderazioneDal && d0 < ponderazioneDal);
    let prezzi = null;
    if (!storico && acquisti.length > 0) {
      const cald0 = contatori.find((c) => c.tipo === "caldaia_litri" && c.unita_id === (generale && generale.unita_id));
      const m0 = cald0 ? valoreA(letture, cald0.id, d0) : null;
      const m1 = cald0 ? valoreA(letture, cald0.id, d1) : null;
      prezzi = prezzoFifo(acquisti, m0, m1, offsetLitri);
      if (!prezzi) avvisi.push("Prezzo del gasolio non calcolabile (letture caldaia o acquisti mancanti): uso il prezzo di riferimento");
    }
    if (prezzi && prezzi.stimato) avvisi.push("Prezzo pieno stimato per alcuni acquisti (scontato + 0,12256 €/l)");
    if (prezzi && prezzi.oltre) avvisi.push("Il consumo supera i litri acquistati registrati: usato l'ultimo prezzo per la parte eccedente");
    const fattoreDi = (u) => {
      if (!prezzi) return 1;
      const p = u.prezzo_gasolio === "scontato" ? prezzi.scontato : prezzi.pieno;
      return p / rif;
    };

    // riscaldamento: costo generale al prezzo di riferimento, ripartito sui consumi pesati, poi proporzionato al prezzo
    const dGen = delta(generale);
    const costoGen = dGen !== null && tar ? dGen * Number(tar.eur_mwh) : null;
    const righe = unita
      .filter((u) => u.ripartizione)
      .map((u) => {
        const cal = contatori.find((c) => c.unita_id === u.id && c.tipo === "calore");
        const lit = contatori.find((c) => c.unita_id === u.id && c.tipo === "contalitri");
        const dCal = delta(cal);
        const dLit = delta(lit);
        const fattore = fattoreDi(u);
        return {
          unita: u,
          deltaCalore: dCal,
          deltaAcqua: dLit,
          pesato: dCal !== null ? dCal * Number(u.peso) : null,
          fattore,
          prezzoL: prezzi ? (u.prezzo_gasolio === "scontato" ? prezzi.scontato : prezzi.pieno) : null,
          acqua: dLit !== null && tar ? dLit * Number(tar.eur_m3) * fattore : null,
          riscaldamento: null,
          totale: null,
        };
      });
    const sommaPesata = righe.reduce((s2, r) => s2 + (r.pesato || 0), 0);
    for (const r of righe) {
      if (costoGen !== null && r.pesato !== null && sommaPesata > 0) {
        r.riscaldamento = (r.pesato / sommaPesata) * costoGen * r.fattore;
      }
      if (r.riscaldamento !== null || r.acqua !== null) r.totale = (r.riscaldamento || 0) + (r.acqua || 0);
      if (r.riscaldamento === null || r.acqua === null) avvisi.push("Letture mancanti per " + r.unita.nome);
    }

    // famiglie
    const perFamiglia = {};
    for (const r of righe) {
      if (!r.unita.famiglia_id || r.totale === null) continue;
      perFamiglia[r.unita.famiglia_id] = (perFamiglia[r.unita.famiglia_id] || 0) + r.totale;
    }

    // gasolio caldaia (informativo)
    const cald = contatori.find((c) => c.tipo === "caldaia_litri" && c.unita_id === (generale && generale.unita_id));
    const litri = delta(cald);
    periodi.push({
      da: d0,
      a: d1,
      tariffa: tar,
      prezzi,
      rif,
      storico,
      costoGenerale: costoGen,
      deltaGenerale: dGen,
      righe,
      perFamiglia,
      litri,
      costoGasolio: litri !== null && tar && tar.eur_l_condomini ? litri * Number(tar.eur_l_condomini) : null,
      avvisi: [...new Set(avvisi)],
    });
  }
  return periodi;
}
