import { supabase } from "../../../../lib/supabaseClient";
import { costruisciEvento, costruisciEventoCalendario, calendarioIcs } from "../../../../lib/calendario";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request, { params }) {
  const token = String(params.token || "").replace(/\.ics$/i, "");
  if (!UUID.test(token)) {
    return new Response("Link non valido", { status: 404 });
  }

  const { data, error } = await supabase.rpc("feed_calendario", { p_token: token });
  if (error) {
    return new Response("Errore nel calendario", { status: 500 });
  }
  // eventi creati dall'admin (se la funzione non esiste ancora, si prosegue senza)
  const { data: evs } = await supabase.rpc("feed_eventi", { p_token: token });
  if ((!data || data.length === 0) && (!evs || evs.length === 0)) {
    // Token sconosciuto o nessun evento: restituiamo comunque un calendario vuoto valido
    return new Response(calendarioIcs([], "Villa Dumontel"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const appUrl = new URL(request.url).origin;
  const ruolo = (data && data[0] ? data[0].ruolo : evs && evs[0] ? evs[0].ruolo : null);
  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "it";
  const { data: tk } = await supabase.from("task_pulizie").select("nome_it, nome_en");
  const taskMap = Object.fromEntries((tk || []).filter((x) => x.nome_en).map((x) => [x.nome_it, x.nome_en]));
  const eventi = (data || []).map((r) => costruisciEvento(r, { ruolo, appUrl, lang, taskMap }));
  (evs || []).forEach((e) => eventi.push(costruisciEventoCalendario(e, { lang })));

  return new Response(calendarioIcs(eventi, "Villa Dumontel"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="villa-dumontel.ics"',
      "Cache-Control": "no-store",
    },
  });
}
