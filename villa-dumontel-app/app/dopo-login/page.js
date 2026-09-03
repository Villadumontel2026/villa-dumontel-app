"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function DopoLogin() {
  const [stato, setStato] = useState("Verifica in corso...");
  const router = useRouter();

  useEffect(() => {
    async function verifica(session) {
      const { data: profilo, error } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !profilo) {
        setStato(
          "Accesso riuscito, ma non hai ancora un profilo associato. Contatta l'amministratore."
        );
        return;
      }

      if (profilo.ruolo === "admin") {
        router.replace("/richieste");
      } else if (profilo.ruolo === "collaboratore") {
        router.replace("/pulizie/collaboratore");
      } else {
        router.replace("/pulizie/ospite");
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) verifica(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) verifica(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <main>
      <h1>Accesso</h1>
      <div className="card">
        <p>{stato}</p>
      </div>
    </main>
  );
}
