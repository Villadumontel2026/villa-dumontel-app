// Service worker per le notifiche push (servito all'indirizzo /sw.js)
export const dynamic = "force-static";

const SCRIPT = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  const titolo = d.title || "Villa Dumontel";
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(titolo, {
        body: d.body || "",
        icon: "/icons/192",
        badge: "/icons/192",
        data: { url: d.url || "/" },
      });
      // numero sull'icona dell'app: +1 a ogni notifica (l'app lo riallinea quando si apre)
      try {
        const c = await caches.open("vd-badge");
        const r = await c.match("/badge");
        const n = (r ? parseInt(await r.text(), 10) || 0 : 0) + 1;
        await c.put("/badge", new Response(String(n)));
        if (self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge(n);
      } catch (e) {}
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
`;

export async function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
