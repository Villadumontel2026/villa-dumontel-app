import { createClient } from "@supabase/supabase-js";
import { inviaPush } from "../../../../lib/webpush";

export const dynamic = "force-dynamic";

// Invia una notifica di prova ai dispositivi dell'utente che chiama (serve il suo accesso)
export async function POST(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return Response.json({ errore: "Accesso richiesto" }, { status: 401 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u } = await db.auth.getUser();
  if (!u || !u.user) return Response.json({ errore: "Accesso non valido" }, { status: 401 });

  const { data: subs, error } = await db.from("push_sottoscrizioni").select("endpoint, p256dh, auth");
  if (error) return Response.json({ errore: error.message }, { status: 500 });
  if (!subs || subs.length === 0) return Response.json({ errore: "Nessun dispositivo registrato" }, { status: 404 });

  const esiti = [];
  for (const s of subs) {
    const r = await inviaPush(s, {
      title: "Villa Dumontel",
      body: "Notifica di prova: se la vedi, le push funzionano.",
      url: "/account",
    });
    esiti.push({ status: r.status, ok: r.ok, errore: r.errore || null });
    if (r.status === 404 || r.status === 410) {
      await db.from("push_sottoscrizioni").delete().eq("endpoint", s.endpoint);
    }
  }
  return Response.json({ esiti });
}
