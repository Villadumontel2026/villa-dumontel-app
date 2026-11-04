"use client";

import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// Numero rosso sull'icona dell'app (come WhatsApp) = avvisi non letti.
// Funziona sull'app installata (iPhone iOS 16.4+, Android, PC). Il service worker lo aumenta
// a ogni notifica push; qui lo si riallinea al numero reale quando l'app e' aperta.
async function impostaBadge(n) {
  try {
    if (typeof navigator === "undefined") return;
    if (n > 0 && navigator.setAppBadge) await navigator.setAppBadge(n);
    else if (n <= 0 && navigator.clearAppBadge) await navigator.clearAppBadge();
  } catch (e) {}
  try {
    if (typeof caches !== "undefined") {
      const c = await caches.open("vd-badge");
      await c.put("/badge", new Response(String(Math.max(0, n))));
    }
  } catch (e) {}
}

export default function BadgeApp() {
  useEffect(() => {
    let attivo = true;
    let info = null;

    async function conta() {
      try {
        if (!info) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return impostaBadge(0);
          const { data: p } = await supabase
            .from("profili")
            .select("ruolo, famiglia_id, collaboratore_id")
            .eq("id", session.user.id)
            .single();
          if (!p) return;
          if (p.ruolo === "admin") info = { tipo: "admin", id: null };
          else if (p.ruolo === "ospite") info = { tipo: "famiglia", id: p.famiglia_id };
          else if (p.ruolo === "collaboratore") info = { tipo: "collaboratore", id: p.collaboratore_id };
          else return;
        }
        let q = supabase
          .from("avvisi")
          .select("id", { count: "exact", head: true })
          .eq("destinatario_tipo", info.tipo)
          .eq("letto", false);
        q = info.id === null ? q.is("destinatario_id", null) : q.eq("destinatario_id", info.id);
        const { count } = await q;
        if (attivo && typeof count === "number") impostaBadge(count);
      } catch (e) {}
    }

    conta();
    const visibile = () => document.visibilityState === "visible" && conta();
    document.addEventListener("visibilitychange", visibile);
    window.addEventListener("vd-avvisi", conta);
    const timer = setInterval(visibile, 60000);
    return () => {
      attivo = false;
      document.removeEventListener("visibilitychange", visibile);
      window.removeEventListener("vd-avvisi", conta);
      clearInterval(timer);
    };
  }, []);

  return null;
}
