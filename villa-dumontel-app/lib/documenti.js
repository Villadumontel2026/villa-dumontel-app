import { supabase } from "./supabaseClient";

export const CATEGORIE = ["fattura", "contratto", "istruzioni", "info", "altro"];

export const ETICHETTE_CATEGORIA_IT = {
  fattura: "Fatture e ricevute",
  contratto: "Contratti e documenti",
  istruzioni: "Istruzioni",
  info: "Informazioni",
  altro: "Altro",
};

export function dimensioneLeggibile(byte) {
  const n = Number(byte || 0);
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function nomeSicuro(nome) {
  return String(nome || "file")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(-90);
}

// Apre (o scarica) un documento con un link temporaneo di 2 minuti
export async function apriDocumento(doc, scarica = false) {
  const { data, error } = await supabase.storage
    .from("documenti")
    .createSignedUrl(doc.percorso, 120, scarica ? { download: doc.nome } : undefined);
  if (error || !data?.signedUrl) {
    alert("Impossibile aprire il documento: " + (error?.message || ""));
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

// Carica un file e, se indicato, lo collega a una o piu' spese
export async function caricaDocumento(file, { categoria = "altro", visibilita = "admin", famiglia_id = null, spesaIds = [], note = null } = {}) {
  const anno = new Date().getFullYear();
  const id = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).slice(0, 12);
  const percorso = `${anno}/${id}-${nomeSicuro(file.name)}`;

  const up = await supabase.storage.from("documenti").upload(percorso, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (up.error) return { errore: up.error.message };

  const { data: doc, error } = await supabase
    .from("documenti")
    .insert({
      nome: file.name,
      percorso,
      mime: file.type || null,
      dimensione: file.size,
      categoria,
      visibilita,
      famiglia_id: visibilita === "famiglia" ? famiglia_id : null,
      note,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from("documenti").remove([percorso]);
    return { errore: error.message };
  }
  if (spesaIds.length) {
    const { error: e2 } = await supabase
      .from("documenti_spese")
      .insert(spesaIds.map((spesa_id) => ({ documento_id: doc.id, spesa_id })));
    if (e2) return { errore: e2.message, doc };
  }
  return { doc };
}

// Elimina il documento (riga + file)
export async function eliminaDocumento(doc) {
  const { error } = await supabase.from("documenti").delete().eq("id", doc.id);
  if (error) return error.message;
  await supabase.storage.from("documenti").remove([doc.percorso]);
  return null;
}
