// Eventi del calendario (creati dall'admin): espansione sui giorni e colori.

const pad = (n) => String(n).padStart(2, "0");
const isoDa = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const daIso = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const COLORI_EVENTO = { villa: "#8a6a2f", famiglia: "#2b6a9e", admin: "#6b6b60" };

// Un evento su piu' giorni diventa una voce per ogni giorno (come una richiesta, cosi' lo mostra CalendarioVista)
export function espandiEventi(eventi, lang = "it") {
  const out = [];
  (eventi || []).forEach((e) => {
    const inizio = daIso(e.data_inizio);
    const fine = e.data_fine ? daIso(e.data_fine) : inizio;
    const en = lang === "en";
    const titolo = en && e.titolo_en ? e.titolo_en : e.titolo;
    const note = en && e.note_en ? e.note_en : e.note;
    let n = 0;
    for (let d = new Date(inizio); d <= fine && n < 400; d.setDate(d.getDate() + 1), n++) {
      const g = isoDa(d);
      out.push({
        id: "ev" + e.id + "-" + g,
        evento_id: e.id,
        tipo: "evento",
        stato: "confermata",
        data: g,
        ora: g === e.data_inizio ? e.ora_inizio : null,
        titolo,
        note,
        _evento: e,
        primoGiorno: g === e.data_inizio,
        ultimoGiorno: g === (e.data_fine || e.data_inizio),
      });
    }
  });
  return out;
}

export function coloreEvento(r) {
  const e = r._evento || {};
  return COLORI_EVENTO[e.per_tipo] || COLORI_EVENTO.villa;
}

// Testo del periodo, es. "23/10/2026 14:00" oppure "23/10/2026 - 27/10/2026"
export function periodoEvento(e, fmt) {
  const a = fmt(e.data_inizio) + (e.ora_inizio ? " " + String(e.ora_inizio).slice(0, 5) : "");
  if (!e.data_fine && !e.ora_fine) return a;
  const dataFine = e.data_fine || e.data_inizio;
  const b = fmt(dataFine) + (e.ora_fine ? " " + String(e.ora_fine).slice(0, 5) : "");
  return a + " - " + b;
}
