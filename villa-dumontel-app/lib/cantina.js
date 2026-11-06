// Utilita' per la cantina: codici di posizione, colori, nomi dei vini.

export const LETTERE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const ZONE = ["Cantinetta", "Magnum", "Cartoni", "Altro"];
export const MOTIVI_SCARICO = ["bevuta", "venduta", "regalata", "rotta o difettosa", "altro"];
export const TIPOLOGIE = ["Rosso", "Bianco", "Rosé", "Spumante", "Distillato", "Altro"];

// "03-C4" = scaffalatura 03, colonna C, riga 4 (riga 0 = fila sopra lo scaffale)
export const codicePosizione = (scaffale, colonna, riga) => `${scaffale.codice}-${LETTERE[colonna - 1]}${riga}`;

export function righeScaffale(s) {
  const out = [];
  for (let r = s.riga_min; r <= s.riga_max; r++) out.push(r);
  return out;
}

export const capienza = (s) => s.colonne * (s.riga_max - s.riga_min + 1);

export function coloreTipologia(t) {
  const x = String(t || "").toLowerCase();
  if (x.startsWith("ross")) return { bg: "#8b2e3c", fg: "#ffffff" };
  if (x.startsWith("bianc")) return { bg: "#e8dc8a", fg: "#4a4320" };
  if (x.startsWith("ros")) return { bg: "#eba0aa", fg: "#5a1f29" };
  if (x.startsWith("spum") || x.startsWith("champ")) return { bg: "#d4b84a", fg: "#3d3410" };
  return { bg: "#9a9a8f", fg: "#ffffff" };
}

export function nomeVino(v, conProduttore = true) {
  if (!v) return "";
  const parti = [];
  if (conProduttore && v.produttore) parti.push(v.produttore);
  parti.push(v.nome);
  if (v.annata) parti.push(String(v.annata));
  if (v.formato && v.formato !== "0,75 l") parti.push(v.formato);
  return parti.join(" · ");
}

export const sigla = (v) => {
  const p = String((v && v.nome) || "?").replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ").trim().split(/\s+/);
  return ((p[0] || "?")[0] + ((p[1] || p[0] || "")[p[1] ? 0 : 1] || "")).toUpperCase();
};

export const cercaVini = (vini, testo) => {
  const q = String(testo || "").trim().toLowerCase();
  if (!q) return vini;
  return vini.filter((v) =>
    [v.produttore, v.nome, v.denominazione, v.tipologia, v.vitigni, v.annata, v.formato].join(" ").toLowerCase().includes(q)
  );
};

// ---------- maturita' ----------
export const STATI = ["immaturo", "giovane", "pronto", "maturo", "da_collezione"];
export const STATI_INFO = {
  immaturo: { it: "Immaturo", en: "Immature", colore: "#c62828", fg: "#ffffff" },
  giovane: { it: "Giovane", en: "Young", colore: "#f2c230", fg: "#3d3410" },
  pronto: { it: "Pronto", en: "Ready", colore: "#8bc34a", fg: "#1f3d10" },
  maturo: { it: "Maturo", en: "Mature", colore: "#2e7d32", fg: "#ffffff" },
  da_collezione: { it: "Da collezione", en: "Collector's", colore: "#aeb6bd", fg: "#25292d" },
};

const GIORNI_ANNO = 365.25;

// Stato calcolato dalla data di riferimento e dagli anni per raggiungere ogni stato
export function statoMaturita(v, oggi = new Date()) {
  if (!v || !v.maturita_ingresso) return null;
  const { anni_giovane: g, anni_pronto: p, anni_maturo: m, anni_collezione: c } = v;
  if ([g, p, m, c].some((x) => x === null || x === undefined)) return null;
  const rif = new Date(v.maturita_ingresso + "T00:00:00");
  const e = (oggi - rif) / 86400000 / GIORNI_ANNO;
  if (e >= Number(c)) return "da_collezione";
  if (e >= Number(m)) return "maturo";
  if (e >= Number(p)) return "pronto";
  if (e >= Number(g)) return "giovane";
  return "immaturo";
}

// Data prevista (testo) in cui il vino raggiunge lo stato dato
export function dataStato(v, stato) {
  if (!v || !v.maturita_ingresso) return null;
  const anni = { giovane: v.anni_giovane, pronto: v.anni_pronto, maturo: v.anni_maturo, da_collezione: v.anni_collezione }[stato];
  if (anni === null || anni === undefined) return null;
  const d = new Date(v.maturita_ingresso + "T00:00:00");
  d.setTime(d.getTime() + Number(anni) * GIORNI_ANNO * 86400000);
  return d;
}

// Raggruppa le righe vino per zona di produzione -> produttore -> vino (nome)
export function indiceVini(vini) {
  const zone = new Map();
  vini.forEach((v) => {
    const z = v.zona_produzione || "Altre zone";
    const p = v.produttore || "Senza produttore";
    if (!zone.has(z)) zone.set(z, new Map());
    const prod = zone.get(z);
    if (!prod.has(p)) prod.set(p, new Map());
    const vin = prod.get(p);
    if (!vin.has(v.nome)) vin.set(v.nome, []);
    vin.get(v.nome).push(v);
  });
  return zone;
}

export const etichettaAnnata = (v) =>
  [v.annata ? String(v.annata) : "senza annata", v.formato && v.formato !== "0,75 l" ? v.formato : null].filter(Boolean).join(" · ");
