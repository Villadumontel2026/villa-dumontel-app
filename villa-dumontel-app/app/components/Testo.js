"use client";

import { useApp } from "./AppProvider";
import { campo } from "../../lib/lingua";

// Mostra il testo nella lingua scelta; se manca la traduzione ripiega su inglese e poi italiano.
// en = testo base inglese (campo senza suffisso), it = versione italiana, fr = versione francese.
export default function Testo({ en, it, fr, className, style }) {
  const { lang } = useApp();
  const testo = campo({ en, it, fr }, "", lang) || "";
  if (!testo) return null;
  return (
    <p className={className} style={style}>
      {testo}
    </p>
  );
}
