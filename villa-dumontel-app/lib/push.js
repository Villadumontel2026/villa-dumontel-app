// Lato browser: attivare / disattivare le notifiche push su questo dispositivo
import { supabase } from "./supabaseClient";

const base64ToUint8 = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export function pushSupportato() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function eIphoneNonInstallato() {
  if (typeof window === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export async function statoPush() {
  if (!pushSupportato()) return "non-supportato";
  if (Notification.permission === "denied") return "bloccato";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === "granted" ? "attivo" : "spento";
}

export async function attivaPush() {
  const chiave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!chiave) throw new Error("Chiave push non configurata");
  const permesso = await Notification.requestPermission();
  if (permesso !== "granted") throw new Error("Permesso negato");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8(chiave),
    });
  }
  const j = sub.toJSON();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Accesso richiesto");
  const { error } = await supabase.from("push_sottoscrizioni").upsert(
    {
      user_id: session.user.id,
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
      dispositivo: (navigator.userAgent || "").slice(0, 120),
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function disattivaPush() {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await supabase.from("push_sottoscrizioni").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}
