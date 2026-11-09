"use client";

import { useApp } from "./AppProvider";

// Elenco delle sezioni Info. La collaboratrice vede solo le informazioni generali.
export default function InfoCards({ sezioni }) {
  const { t, ruolo, pronto } = useApp();
  if (!pronto) return null;
  const base = ruolo === "collaboratore" ? sezioni.filter((s) => s.href === "/info/generale") : sezioni;
  const visibili = base.filter((s) => !s.soloAdmin || ruolo === "admin");
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {visibili.map((s) => (
        <a key={s.href} href={s.href} className="card" style={{ display: "block" }}>
          <h2 style={{ marginBottom: "0.25rem" }}>{t(s.titolo)}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {t(s.descrizione)}
          </p>
        </a>
      ))}
    </div>
  );
}
