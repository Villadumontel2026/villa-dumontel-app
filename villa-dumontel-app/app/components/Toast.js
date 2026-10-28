"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";

// Messaggio "Salvato" che compare in basso dopo ogni modifica andata a buon fine
export default function Toast() {
  const { lang } = useApp();
  const [visibile, setVisibile] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    function mostra() {
      setVisibile(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisibile(false), 2200);
    }
    window.addEventListener("vd-salvato", mostra);
    return () => {
      window.removeEventListener("vd-salvato", mostra);
      clearTimeout(timer.current);
    };
  }, []);

  if (!visibile) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "1.5rem",
        transform: "translateX(-50%)",
        background: "#2f4739",
        color: "white",
        padding: "0.65rem 1.25rem",
        borderRadius: 999,
        boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
        fontSize: "0.95rem",
        zIndex: 1000,
      }}
    >
      &#10003; {lang === "en" ? "Saved" : "Salvato"}
    </div>
  );
}
