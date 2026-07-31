"use server";

import { supabase } from "../../lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function creaRichiesta(formData) {
  const tipo = formData.get("tipo");
  const alloggio_id = formData.get("alloggio_id");
  const data = formData.get("data") || null;
  const ora = formData.get("ora") || null;
  const sotto_tipo = formData.get("sotto_tipo") || null;
  const paxRaw = formData.get("pax");
  const note = formData.get("note");

  let descrizione = formData.get("descrizione") || "";
  const voci = formData.getAll("voci");
  if (voci.length > 0) {
    descrizione = voci.join(", ");
  }

  const { data: alloggio } = await supabase
    .from("alloggi")
    .select("famiglia_id")
    .eq("id", alloggio_id)
    .single();

  await supabase.from("richieste").insert({
    tipo,
    alloggio_id,
    famiglia_id: alloggio?.famiglia_id || null,
    data,
    ora,
    sotto_tipo,
    pax: paxRaw ? parseInt(paxRaw, 10) : null,
    descrizione,
    note,
    stato: "nuova",
  });

  revalidatePath("/richieste");
}

export async function aggiornaStato(id, stato) {
  await supabase.from("richieste").update({ stato }).eq("id", id);
  revalidatePath("/richieste");
}
