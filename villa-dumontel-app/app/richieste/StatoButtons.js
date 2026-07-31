"use client";

import { aggiornaStato } from "./actions";

const STATI = ["nuova", "in gestione", "confermata", "completata"];

export default function StatoButtons({ id, statoAttuale }) {
  return (
    <>
      {STATI.filter((s) => s !== statoAttuale).map((s) => (
        <button key={s} onClick={() => aggiornaStato(id, s)}>
          &rarr; {s}
        </button>
      ))}
    </>
  );
}
