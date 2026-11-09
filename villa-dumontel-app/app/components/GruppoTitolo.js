"use client";

import { useApp } from "./AppProvider";

const NOMI = {
  "Entrèves": { it: "Entrèves", en: "Entrèves" },
  "Val Ferret": { it: "Val Ferret", en: "Val Ferret" },
  "Courmayeur": { it: "Courmayeur", en: "Courmayeur" },
  "On the slopes": { it: "Sulle piste", en: "On the slopes" },
  "Valdigne": { it: "Valdigne (Morgex, La Salle, Avise, Arvier)", en: "Valdigne (Morgex, La Salle, Avise, Arvier)", br: "Valdigne" },
  "Aosta area": { it: "Aosta e dintorni", en: "Aosta and surroundings", br: "Aosta" },
  "Chamonix": { it: "Chamonix (Francia)", en: "Chamonix (France)", br: "Chamonix" },
  "Elsewhere": { it: "Altrove", en: "Elsewhere" },
};

export function nomeGruppo(nome, lang, breve = false) {
  const n = NOMI[nome];
  if (!n) return nome;
  if (breve && n.br) return n.br;
  return lang === "en" ? n.en : n.it;
}

export default function GruppoTitolo({ nome, breve = false }) {
  const { lang } = useApp();
  return <>{nomeGruppo(nome, lang, breve)}</>;
}
