"use client";

import { useApp } from "./AppProvider";

const NOMI = {
  "On the slopes": { it: "Sulle piste", en: "On the slopes" },
  "Val Ferret": { it: "Val Ferret", en: "Val Ferret" },
};

export function nomeGruppo(nome, lang) {
  const n = NOMI[nome];
  return n ? (lang === "en" ? n.en : n.it) : nome;
}

export default function GruppoTitolo({ nome }) {
  const { lang } = useApp();
  return <>{nomeGruppo(nome, lang)}</>;
}
