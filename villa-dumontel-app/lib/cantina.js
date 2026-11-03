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
