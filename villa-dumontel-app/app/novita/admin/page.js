"use client";

import { useEffect } from "react";

// Le novita' si gestiscono ora in cima alla pagina Informazioni.
export default function NovitaAdminRedirect() {
  useEffect(() => {
    window.location.replace("/info");
  }, []);
  return (
    <main>
      <p>
        <a href="/info" className="btn">
          Vai a Informazioni
        </a>
      </p>
    </main>
  );
}
