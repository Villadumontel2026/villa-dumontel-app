// Stato degli appartamenti (per famiglia): occupazione, periodo di affitto, pulizie.

const pad = (n) => String(n).padStart(2, "0");

// Data di oggi a Roma come "YYYY-MM-DD"
export function oggiRoma(adesso = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(adesso)
      .map((x) => [x.type, x.value])
  );
  return p.year + "-" + p.month + "-" + p.day;
}

const d10 = (s) => String(s).slice(0, 10);

// Occupazione di una famiglia a partire dagli eventi di tipo arrivo/partenza.
// Regole: occupato dall'arrivo fino alla fine del soggiorno compresa (data di fine dell'arrivo, oppure primo evento "partenza" successivo);
// senza fine resta occupato finche' non si registra la fine. Prenotato = c'e' un arrivo futuro. Altrimenti libero.
export function occupazione(famigliaId, eventi, oggi) {
  const mie = (eventi || []).filter((e) => e.per_famiglia_id === famigliaId);
  const arrivi = mie
    .filter((e) => e.tipo_evento === "arrivo")
    .sort((a, b) => d10(a.data_inizio).localeCompare(d10(b.data_inizio)));
  const partenze = mie.filter((e) => e.tipo_evento === "partenza").map((e) => d10(e.data_inizio)).sort();

  const soggiorni = arrivi.map((a, i) => {
    const inizio = d10(a.data_inizio);
    const prossimoArrivo = arrivi[i + 1] ? d10(arrivi[i + 1].data_inizio) : null;
    let fine = a.data_fine ? d10(a.data_fine) : null;
    if (!fine) {
      fine = partenze.find((p) => p >= inizio && (!prossimoArrivo || p < prossimoArrivo)) || null;
    }
    return { arrivo: a, inizio, fine };
  });

  const inCorso = soggiorni.filter((s) => s.inizio <= oggi && (s.fine === null || s.fine >= oggi)).pop();
  const prossimo = soggiorni.find((s) => s.inizio > oggi) || null;
  if (inCorso) {
    return { stato: "occupato", arrivo: inCorso.inizio, fine: inCorso.fine, note: inCorso.arrivo.note || null, prossimoArrivo: prossimo ? prossimo.inizio : null, eventoId: inCorso.arrivo.id };
  }
  if (prossimo) {
    return { stato: "prenotato", arrivo: prossimo.inizio, fine: prossimo.fine, note: prossimo.arrivo.note || null, prossimoArrivo: prossimo.inizio, eventoId: prossimo.arrivo.id };
  }
  return { stato: "libero", arrivo: null, fine: null, note: null, prossimoArrivo: null, eventoId: null };
}

// Periodo di affitto da mostrare: quello in corso, altrimenti il prossimo, altrimenti l'ultimo concluso.
export function periodoAffitto(famigliaId, affitti, oggi) {
  const mie = (affitti || []).filter((a) => a.famiglia_id === famigliaId).sort((a, b) => d10(a.dal).localeCompare(d10(b.dal)));
  const inCorso = mie.find((a) => d10(a.dal) <= oggi && (!a.al || d10(a.al) >= oggi));
  if (inCorso) return { ...inCorso, quando: "in corso" };
  const futuro = mie.find((a) => d10(a.dal) > oggi);
  if (futuro) return { ...futuro, quando: "futuro" };
  const ultimo = mie[mie.length - 1];
  return ultimo ? { ...ultimo, quando: "concluso" } : null;
}

export const ETICHETTE_OCCUPAZIONE = { occupato: "Occupato", prenotato: "Prenotato", libero: "Libero" };
export const COLORI_OCCUPAZIONE = {
  occupato: { bg: "#fde2e2", fg: "#8a1f1f" },
  prenotato: { bg: "#fff1d6", fg: "#8a5a00" },
  libero: { bg: "#dff3e3", fg: "#1f5c2e" },
};
export const ETICHETTE_PULIZIA = { da_pulire: "Da pulire", in_corso: "Pulizie in corso", pulito: "Pulito" };
export const COLORI_PULIZIA = {
  da_pulire: { bg: "#fde2e2", fg: "#8a1f1f" },
  in_corso: { bg: "#fff1d6", fg: "#8a5a00" },
  pulito: { bg: "#dff3e3", fg: "#1f5c2e" },
};
