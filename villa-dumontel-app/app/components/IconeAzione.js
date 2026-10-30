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

export function Graffetta({ onClick, titolo = "Allega un file" }) {
  return (
    <button type="button" onClick={onClick} title={titolo} aria-label={titolo} style={stile}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5 12.5 20a5.5 5.5 0 0 1-7.8-7.8l9-9a3.7 3.7 0 0 1 5.2 5.3l-9 9a1.8 1.8 0 0 1-2.6-2.6l8.2-8.2" />
      </svg>
    </button>
  );
}
