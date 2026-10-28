import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Operazioni che non devono mostrare "Salvato" (azioni di servizio o con messaggio proprio)
const SENZA_CONFERMA = ["/rpc/segna_avvisi_letti", "push_sottoscrizioni", "preferenze_notifiche", "calendari_token"];

// Ogni scrittura andata a buon fine sul database fa comparire il messaggio "Salvato" (vedi componente Toast)
function fetchConConferma(input, init) {
  const risposta = fetch(input, init);
  if (typeof window === "undefined") return risposta;
  try {
    const metodo = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (
      ["POST", "PATCH", "PUT", "DELETE"].includes(metodo) &&
      url.includes("/rest/v1/") &&
      !SENZA_CONFERMA.some((x) => url.includes(x))
    ) {
      risposta.then((r) => {
        if (r.ok) window.dispatchEvent(new CustomEvent("vd-salvato"));
      });
    }
  } catch (e) {}
  return risposta;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchConConferma },
});
