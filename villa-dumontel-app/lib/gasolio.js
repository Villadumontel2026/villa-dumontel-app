// Calcolo dei consumi e delle quote di riscaldamento / acqua calda per periodo (tra due letture).
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

export function tariffaPer(tariffe, data) {
  const ok = tariffe
    .filter((t) => String(t.valida_dal).slice(0, 10) <= data)
    .sort((a, b) => String(b.valida_dal).localeCompare(String(a.valida_dal)));
  return ok[0] || null;
}

// unita: [{id, nome, famiglia_id, peso, ripartizione}], contatori: [{id, unita_id, tipo, nome}], letture: [{contatore_id, data, valore}]
export function calcolaPeriodi({ unita, contatori, letture, tariffe }) {
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

    // riscaldamento
    const dGen = delta(generale);
    const costoGen = dGen !== null && tar ? dGen * Number(tar.eur_mwh) : null;
    const righe = unita
      .filter((u) => u.ripartizione)
      .map((u) => {
        const cal = contatori.find((c) => c.unita_id === u.id && c.tipo === "calore");
        const lit = contatori.find((c) => c.unita_id === u.id && c.tipo === "contalitri");
        const dCal = delta(cal);
        const dLit = delta(lit);
        return {
          unita: u,
          deltaCalore: dCal,
          deltaAcqua: dLit,
          teorico: dCal !== null && tar ? dCal * Number(tar.eur_mwh) * Number(u.peso) : null,
          acqua: dLit !== null && tar ? dLit * Number(tar.eur_m3) : null,
          riscaldamento: null,
          totale: null,
        };
      });
    const sommaTeorico = righe.reduce((s, r) => s + (r.teorico || 0), 0);
    for (const r of righe) {
      if (costoGen !== null && r.teorico !== null && sommaTeorico > 0) {
        r.riscaldamento = (r.teorico / sommaTeorico) * costoGen;
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
