"use client";

import { useApp } from "./AppProvider";

// Mostra il testo nella lingua scelta; se manca la traduzione usa l'inglese.
export default function Testo({ en, it, className, style }) {
  const { lang } = useApp();
  const testo = lang === "it" ? it || en : en || it;
  if (!testo) return null;
  return (
    <p className={className} style={style}>
      {testo}
    </p>
  );
}
