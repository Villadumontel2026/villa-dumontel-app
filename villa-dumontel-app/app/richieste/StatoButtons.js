"use client";

import { aggiornaStato } from "./actions";

const STATI = ["nuova", "in gestione", "confermata", "completata"];

export default function StatoButtons({ id, statoAttuale }) {
  return (
    <span style={{ marginLeft: "0.75rem" }}>
      {STATI.filter((s) => s !== statoAttuale).map((s) => (
        <button
          key={s}
          onClick={() => aggiornaStato(id, s)}
          style={{ marginRight: "0.25rem", fontSize: "12px" }}
        >
          &rarr; {s}
        </button>
      ))}
    </span>
  );
}
