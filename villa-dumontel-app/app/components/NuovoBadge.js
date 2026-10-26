"use client";

import { useApp } from "./AppProvider";

// Etichetta "Nuovo / New" per i primi 3 mesi dalla data indicata.
export default function NuovoBadge({ dal }) {
  const { t } = useApp();
  if (!dal) return null;
  const [y, m, d] = String(dal).slice(0, 10).split("-").map(Number);
  const inizio = Date.UTC(y, m - 1, d);
  const giorni = (Date.now() - inizio) / 86400000;
  if (isNaN(giorni) || giorni > 92 || giorni < -1) return null;
  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: "0.5rem",
        padding: "0.1rem 0.5rem",
        borderRadius: 999,
        background: "var(--color-accent, #b98b4e)",
        color: "white",
        fontSize: "0.68rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        verticalAlign: "middle",
      }}
    >
      {t("nuovo.badge")}
    </span>
  );
}
