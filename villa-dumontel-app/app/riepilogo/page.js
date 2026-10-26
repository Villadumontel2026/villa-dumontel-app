"use client";

import { useEffect } from "react";

// Il riepilogo ora e' dentro la pagina Spese.
export default function RiepilogoRedirect() {
  useEffect(() => {
    window.location.replace("/spese/admin");
  }, []);
  return (
    <main>
      <p>
        <a href="/spese/admin" className="btn">
          Vai a Spese
        </a>
      </p>
    </main>
  );
}
