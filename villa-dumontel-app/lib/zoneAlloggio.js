import { supabase } from "./supabaseClient";

// Zone degli alloggi caricate una volta sola per pagina (servono per tradurre i nomi salvati in italiano)
let promessa = null;
export function zoneAlloggio() {
  if (!promessa) {
    promessa = supabase
      .from("zone_alloggio")
      .select("*")
      .then(({ data }) => data || []);
  }
  return promessa;
}
