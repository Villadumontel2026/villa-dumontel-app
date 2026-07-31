"use server";

import { supabase } from "../../lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function creaRichiesta(formData) {
  const tipo = formData.get("tipo");
  const alloggio_id = formData.get("alloggio_id");
  const famiglia_id = formData.get("famiglia_id");
  const data = formData.get("data") || null;
  const ora = formData.get("ora") || null;
  const paxRaw = formData.get("pax");
  const descrizione = formData.get("descrizione");
  const note = formData.get("note");

  await supabase.from("richieste").insert({
    tipo,
    alloggio_id,
    famiglia_id,
    data,
    ora,
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
