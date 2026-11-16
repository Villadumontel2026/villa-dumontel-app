"use client";

import { useApp } from "./AppProvider";

export const TUTTA_LA_CASA = "Tutta la casa";

// Menu orizzontale di zone selezionabili. Se conTutta: "Tutta la casa" per prima e, se scelta, blocca le singole voci.
export default function ChipZone({ zone, selezionate, onChange, conTutta = false }) {
  const { lang } = useApp();
  const tutta = selezionate.includes(TUTTA_LA_CASA);

  function toggle(nome) {
    if (nome === TUTTA_LA_CASA) {
      onChange(tutta ? [] : [TUTTA_LA_CASA]);
      return;
    }
    if (tutta) return;
    onChange(selezionate.includes(nome) ? selezionate.filter((x) => x !== nome) : [...selezionate, nome]);
  }

  const chip = (nome, etichetta, bloccato) => {
    const on = selezionate.includes(nome);
    return (
      <button
        key={nome}
        type="button"
        aria-pressed={on}
        disabled={bloccato}
        onClick={() => toggle(nome)}
        className={"vd-chip" + (on ? " vd-chip-on" : "")}
      >
        {etichetta}
      </button>
    );
  };

  return (
    <div className="vd-chips">
      {conTutta && chip(TUTTA_LA_CASA, lang === "en" ? "Whole house" : TUTTA_LA_CASA, false)}
      {zone.map((z) => chip(z.nome, z.nome, tutta))}
    </div>
  );
}
