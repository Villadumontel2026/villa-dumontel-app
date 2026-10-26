"use client";

import { useEffect, useState } from "react";
import { leggiVista, esciDallaVista } from "../../lib/vista";

// Banner fisso visibile all'admin quando sta guardando l'app "come ospite".
export default function VistaBanner() {
  const [vista, setVista] = useState(null);
  useEffect(() => {
    setVista(leggiVista());
  }, []);
  if (!vista) return null;
  return (
    <div
      style={{
        background: "#b98b4e",
        color: "white",
        padding: "0.5rem 1rem",
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        fontSize: "0.9rem",
      }}
    >
      <span>
        Stai vedendo l&apos;app come <strong>{vista.nome}</strong> (le azioni sono reali)
      </span>
      <button
        type="button"
        onClick={() => {
          esciDallaVista();
          window.location.href = "/richieste";
        }}
        style={{ cursor: "pointer", borderRadius: 999, border: "1px solid white", background: "transparent", color: "white", padding: "0.2rem 0.8rem" }}
      >
        Esci dalla vista
      </button>
    </div>
  );
}
