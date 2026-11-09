import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.villadumontel.it";
const MITTENTE = process.env.NOTIFICHE_FROM || "Villa Dumontel <accesso@villadumontel.it>";
const REPLY_TO = process.env.NOTIFICHE_REPLY_TO || null;

const TESTI = {
  it: {
    oggetto: "Villa Dumontel — il tuo accesso è stato approvato",
    ciao: (n) => `Ciao ${n},`,
    corpo: "la tua richiesta di accesso all'app di Villa Dumontel è stata approvata.",
    come: "Per entrare, apri la pagina di accesso, scegli «Link via email», inserisci questo indirizzo email e usa il link che ti arriverà.",
    bottone: "Apri l'app",
  },
  en: {
    oggetto: "Villa Dumontel — your access has been approved",
    ciao: (n) => `Hello ${n},`,
    corpo: "your request to access the Villa Dumontel app has been approved.",
    come: "To sign in, open the login page, choose “Email link”, enter this email address and use the link we send you.",
    bottone: "Open the app",
  },
  fr: {
    oggetto: "Villa Dumontel — votre accès a été approuvé",
    ciao: (n) => `Bonjour ${n},`,
    corpo: "votre demande d'accès à l'application de Villa Dumontel a été approuvée.",
    come: "Pour vous connecter, ouvrez la page de connexion, choisissez « Lien par e-mail », saisissez cette adresse e-mail et utilisez le lien que nous vous enverrons.",
    bottone: "Ouvrir l'application",
  },
};

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Invia all'ospite la mail di approvazione. Solo l'admin puo' chiamarla.
export async function POST(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return Response.json({ errore: "Accesso richiesto" }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return Response.json({ errore: "RESEND_API_KEY mancante" }, { status: 500 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u } = await db.auth.getUser();
  if (!u || !u.user) return Response.json({ errore: "Accesso non valido" }, { status: 401 });

  let id;
  try {
    ({ id } = await request.json());
  } catch (e) {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  // La policy RLS lascia leggere questa tabella solo all'admin
  const { data: r } = await db.from("richieste_accesso").select("*").eq("id", id).maybeSingle();
  if (!r) return Response.json({ errore: "Richiesta non trovata o accesso negato" }, { status: 404 });
  if (r.stato !== "approvata") return Response.json({ errore: "La richiesta non è approvata" }, { status: 400 });

  const tx = TESTI[r.lingua] || TESTI.it;
  const link = APP_URL + "/login";
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#2a2a26">` +
    `<p>${esc(tx.ciao(r.nome))}</p><p>${esc(tx.corpo)}</p><p>${esc(tx.come)}</p>` +
    `<p><a href="${link}" style="background:#2f4739;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${esc(tx.bottone)}</a></p>` +
    `<p style="color:#777;font-size:12px">${esc(r.email)}</p></div>`;
  const corpo = {
    from: MITTENTE,
    to: [r.email],
    subject: tx.oggetto,
    html,
    text: `${tx.ciao(r.nome)}\n\n${tx.corpo}\n${tx.come}\n\n${link}`,
  };
  if (REPLY_TO) corpo.reply_to = REPLY_TO;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) return Response.json({ errore: "Resend " + res.status }, { status: 502 });
  return Response.json({ ok: true });
}
