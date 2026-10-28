import { supabase } from "../../../../lib/supabaseClient";
import { costruisciEvento, invitoIcs } from "../../../../lib/calendario";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.villadumontel.it";
const MITTENTE = process.env.NOTIFICHE_FROM || "Villa Dumontel <accesso@villadumontel.it>";
const EMAIL_ORGANIZZATORE = (MITTENTE.match(/<([^>]+)>/) || [])[1] || "accesso@villadumontel.it";
const REPLY_TO = process.env.NOTIFICHE_REPLY_TO || null;
// Modalita' test: se impostata, TUTTE le mail vanno solo a questo indirizzo
const SOLO_A = process.env.NOTIFICHE_SOLO_A || null;

const PAGINA = {
  admin: "/richieste",
  famiglia: "/ospite/richieste",
  collaboratore: "/pulizie/collaboratore",
};

const TESTI = {
  it: {
    ciao: "Ciao,",
    apri: "Apri l'app",
    invito: "In allegato trovi l'invito al calendario: accettalo per aggiungere l'evento al tuo calendario.",
    annullo: "In allegato trovi l'annullamento: l'evento verrà tolto dal tuo calendario.",
    pref: "Puoi cambiare le preferenze di notifica da Account, nell'app.",
  },
  en: {
    ciao: "Hello,",
    apri: "Open the app",
    invito: "A calendar invitation is attached: accept it to add the event to your calendar.",
    annullo: "A cancellation is attached: the event will be removed from your calendar.",
    pref: "You can change your notification preferences from Account in the app.",
  },
};

const esc = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function elabora(id, segreto, mappaTask) {
  const { data, error } = await supabase.rpc("dati_avviso_per_invio", { p_id: id, p_segreto: segreto });
  if (error) return { id, errore: error.message };
  if (!data) return { id, saltato: true };

  const { avviso, richiesta, destinatari } = data;
  const r = richiesta || {};
  if (r && r.alloggio_nome) r.alloggio = r.alloggio_nome;

  const errori = [];
  let inviate = 0;

  for (const d of destinatari || []) {
    if (!d.email_attive) continue;
    const emailReale = d.email;
    d.email = SOLO_A || d.email;
    const lang = d.lingua === "en" ? "en" : "it";
    const X = TESTI[lang];
    const testo = lang === "en" ? avviso.testo_en : avviso.testo_it;

    // invito al calendario: solo se l'utente lo ha scelto e c'e' un evento con data
    let metodo = null;
    const eRicordo = /^(Promemoria|Reminder):/.test(avviso.testo_it || "");
    if (!eRicordo && d.calendario === "invito" && r.data && avviso.destinatario_tipo !== "admin") {
      if (r.stato === "annullata") metodo = "CANCEL";
      else if (r.stato === "confermata") metodo = "REQUEST";
    }

    let allegati;
    if (metodo) {
      const ev = costruisciEvento(r, { ruolo: d.ruolo, appUrl: APP_URL, lang, taskMap: mappaTask });
      const ics = invitoIcs(ev, {
        metodo,
        organizzatore: EMAIL_ORGANIZZATORE,
        partecipante: d.email,
      });
      allegati = [
        {
          filename: "invito.ics",
          content: Buffer.from(ics, "utf-8").toString("base64"),
          content_type: "text/calendar; charset=utf-8; method=" + metodo,
        },
      ];
    }

    const link = APP_URL + (PAGINA[avviso.destinatario_tipo] || "/");
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#26261f">' +
      "<p>" + X.ciao + "</p>" +
      '<p style="font-size:16px"><strong>' + esc(testo) + "</strong></p>" +
      (metodo ? "<p>" + (metodo === "CANCEL" ? X.annullo : X.invito) + "</p>" : "") +
      '<p><a href="' + link + '" style="background:#2f4739;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">' +
      X.apri + "</a></p>" +
      '<p style="color:#6b6b60;font-size:12px">' + X.pref + "</p></div>";

    const corpo = {
      from: MITTENTE,
      to: [d.email],
      subject:
        (SOLO_A ? "[TEST per " + emailReale + "] " : "") +
        "Villa Dumontel — " +
        (testo.length > 80 ? testo.slice(0, 77) + "..." : testo),
      html,
      text: testo + "\n\n" + link,
    };
    if (REPLY_TO) corpo.reply_to = REPLY_TO;
    if (allegati) corpo.attachments = allegati;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) {
        errori.push(d.email + ": " + res.status + " " + (await res.text()).slice(0, 120));
      } else {
        inviate++;
      }
    } catch (e) {
      errori.push(d.email + ": " + e.message);
    }
  }

  await supabase.rpc("segna_avviso_inviato", {
    p_id: id,
    p_segreto: segreto,
    p_errore: errori.length ? errori.join(" | ").slice(0, 500) : null,
  });
  return { id, inviate, errori: errori.length };
}

export async function POST(request) {
  const atteso = process.env.NOTIFICHE_SEGRETO;
  const ricevuto = request.headers.get("x-notifiche-segreto");
  if (!atteso || ricevuto !== atteso) {
    return new Response("Non autorizzato", { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return new Response("RESEND_API_KEY mancante", { status: 500 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (e) {}

  let ids = [];
  if (body && body.avviso_id) {
    ids = [body.avviso_id];
  } else {
    const { data, error } = await supabase.rpc("avvisi_in_coda", { p_segreto: atteso });
    if (error) return Response.json({ errore: error.message }, { status: 500 });
    ids = data || [];
  }

  const { data: tk } = await supabase.from("task_pulizie").select("nome_it, nome_en");
  const mappaTask = Object.fromEntries((tk || []).filter((x) => x.nome_en).map((x) => [x.nome_it, x.nome_en]));

  const esiti = [];
  for (const id of ids) {
    esiti.push(await elabora(id, atteso, mappaTask));
  }
  return Response.json({ esiti });
}
