"use client";

// Piccole icone per modificare (matita) e eliminare (cestino) accanto alle voci di una lista
const stile = {
  background: "transparent",
  border: "none",
  padding: "0.2rem",
  cursor: "pointer",
  color: "var(--color-muted, #6b6b60)",
  lineHeight: 0,
  borderRadius: 6,
};

export function Matita({ onClick, titolo = "Modifica" }) {
  return (
    <button type="button" onClick={onClick} title={titolo} aria-label={titolo} style={stile}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  );
}

export function Cestino({ onClick, titolo = "Elimina" }) {
  return (
    <button type="button" onClick={onClick} title={titolo} aria-label={titolo} style={stile}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}
