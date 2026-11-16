// Lingue dei contenuti modificabili dall'admin (zone, task, ristoranti, novita...).
// La lingua base e' l'italiano; se manca una traduzione si ripiega su inglese e poi italiano.
export const LINGUE_CONTENUTI = ["it", "en", "fr"];
export const NOMI_LINGUE = { it: "Italiano", en: "English", fr: "Français" };

// campo(riga, "nome", "fr") prova nome_fr, poi nome_en, poi nome_it, poi nome
export function campo(riga, base, lang) {
  if (!riga) return "";
  const ordine = lang === "it" ? ["it", "en", "fr"] : lang === "fr" ? ["fr", "en", "it"] : ["en", "it", "fr"];
  for (const l of ordine) {
    // l'italiano e' la lingua base: se manca il campo "nome_it" vale il campo "nome" (es. zone_alloggio)
    const v = base ? riga[base + "_" + l] || (l === "it" ? riga[base] : null) : riga[l];
    if (v) return v;
  }
  return riga[base] || "";
}

// Traduce un elenco di zone salvato in italiano ("Cucina, Soggiorno") con la tabella delle zone
export function traduciZone(lang, testo, zone) {
  if (!testo || lang === "it") return testo;
  return String(testo)
    .split(", ")
    .map((n) => {
      if (n === "Tutta la casa") return lang === "fr" ? "Toute la maison" : "Whole house";
      const z = (zone || []).find((x) => x.nome === n);
      return z ? campo(z, "nome", lang) : n;
    })
    .join(", ");
}
