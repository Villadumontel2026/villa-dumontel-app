"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Mostra il pulsante "Prenota" solo agli ospiti (non all'admin e non ai visitatori).
export default function PrenotaButton({ tipo, nome }) {
  const [visibile, setVisibile] = useState(false);

  useEffect(() => {
    let attivo = true;
    async function controlla() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profilo } = await supabase
        .from("profili")
        .select("ruolo")
        .eq("id", session.user.id)
        .single();
      if (attivo && profilo?.ruolo === "ospite") setVisibile(true);
    }
    controlla();
    return () => {
      attivo = false;
    };
  }, []);

  if (!visibile) return null;

  return (
    <p style={{ margin: "0.75rem 0 0" }}>
      <a
        className="btn"
        href={"/ospite/prenota?tipo=" + tipo + "&nome=" + encodeURIComponent(nome)}
      >
        Prenota
      </a>
    </p>
  );
}
