"use client";

import { useEffect, useRef } from "react";

// Sezione di una zona, comprimibile. Si apre da sola se l'indirizzo contiene #zona-...
export default function ZonaDetails({ id, titolo, conteggio, children, aperta = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const controlla = () => {
      if (window.location.hash === "#" + id && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    controlla();
    window.addEventListener("hashchange", controlla);
    return () => window.removeEventListener("hashchange", controlla);
  }, [id]);

  return (
    <details ref={ref} id={id} open={aperta} style={{ marginBottom: "1rem", scrollMarginTop: "4.5rem" }} className="card">
      <summary style={{ cursor: "pointer", fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.15rem", fontWeight: 600 }}>
        {titolo} <span className="muted" style={{ fontSize: "0.8em", fontWeight: 400 }}>({conteggio})</span>
      </summary>
      <div style={{ marginTop: "0.9rem" }}>{children}</div>
    </details>
  );
}
