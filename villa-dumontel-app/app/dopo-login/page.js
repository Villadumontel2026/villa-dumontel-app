"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { applicaVista } from "../../lib/vista";

export default function DopoLogin() {
  const { t } = useApp();
  const [stato, setStato] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function verifica(session) {
      const { data: profiloRaw, error } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();

      const profilo = applicaVista(profiloRaw);
      if (error || !profilo) {
        setStato("noProfilo");
        return;
      }

      if (profilo.ruolo === "admin") {
        router.replace("/admin");
      } else if (profilo.ruolo === "collaboratore") {
        router.replace("/collaboratore");
      } else {
        router.replace("/ospite");
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
      <h1>{t("dl.titolo")}</h1>
      <div className="card">
        <p>{stato === "noProfilo" ? t("dl.noProfilo") : t("dl.verifica")}</p>
      </div>
    </main>
  );
}
