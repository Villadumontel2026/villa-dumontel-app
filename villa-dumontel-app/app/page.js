"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useApp } from "./components/AppProvider";

export default function Home() {
  const { t, pronto, email } = useApp();

  // Chi e' gia' entrato va direttamente alla sua home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.replace("/dopo-login");
    });
  }, []);

  return (
    <main>
      <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
        <p
          className="muted"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.75rem", margin: 0 }}
        >
          Entrèves &middot; Courmayeur
        </p>
        <h1 style={{ margin: "0.5rem 0 1rem" }}>{t("pub.titolo")}</h1>
        <p className="muted" style={{ maxWidth: 480, margin: "0 auto 1.75rem" }}>
          {t("pub.testo")}
        </p>
        {pronto && !email && (
          <p>
            <a className="btn" href="/login">
              {t("pub.accedi")}
            </a>
          </p>
        )}
        <p style={{ marginTop: "1rem" }}>
          <a href="/info">{t("pub.info")} &rarr;</a>
        </p>
      </div>
    </main>
  );
}
