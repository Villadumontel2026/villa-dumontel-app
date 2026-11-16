"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useApp } from "../components/AppProvider";
import { applicaVista } from "../../lib/vista";

function haPassword(session) {
  try {
    const p = JSON.parse(atob(session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if ((p.amr || []).some((a) => a.method === "password")) return true;
  } catch (e) {}
  return !!(session.user && session.user.user_metadata && session.user.user_metadata.password_set === true);
}

export default function DopoLogin() {
  const { t } = useApp();
  const [stato, setStato] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function verifica(session) {
      const { data: profiloIniziale, error } = await supabase
        .from("profili")
        .select("*")
        .eq("id", session.user.id)
        .single();

      let profiloRaw = profiloIniziale;
      let profilo = applicaVista(profiloRaw);
      if (error || !profilo) {
        // accesso approvato dall'admin tramite QR: crea il profilo al primo ingresso
        const { data: attivato } = await supabase.rpc("attiva_mio_accesso");
        if (attivato) {
          const { data: nuovo } = await supabase.from("profili").select("*").eq("id", session.user.id).single();
          profiloRaw = nuovo;
          profilo = applicaVista(nuovo);
        }
      }
      if (!profilo) {
        setStato("noProfilo");
        return;
      }

      // Ospite arrivato con il link via email e senza password: la facciamo scegliere subito
      if (profiloRaw && profiloRaw.ruolo === "ospite" && !haPassword(session)) {
        let saltata = false;
        try {
          saltata = window.sessionStorage.getItem("vd_password_dopo") === "1";
        } catch (e) {}
        if (!saltata) {
          router.replace("/imposta-password");
          return;
        }
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
