import { supabase } from "./supabaseClient";

const MAX_LATO = 1600;

// Riduce la foto (lato massimo 1600 px, JPEG) per risparmiare spazio; se non riesce usa l'originale
export async function riduciFoto(file) {
  try {
    if (!file.type || !file.type.startsWith("image/") || file.type === "image/gif") return file;
    const bmp = await createImageBitmap(file);
    const scala = Math.min(1, MAX_LATO / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scala);
    const h = Math.round(bmp.height * scala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    const nome = String(file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch (e) {
    return file;
  }
}

function nomeSicuro(nome) {
  return String(nome || "foto")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(-60);
}

// Carica le foto e le collega a una richiesta o a una manutenzione. Ritorna un messaggio di errore o null.
export async function salvaFoto(files, { famiglia_id = null, richiesta_id = null, manutenzione_id = null }) {
  if (!files || files.length === 0) return null;
  const { data: u } = await supabase.auth.getUser();
  const uid = u && u.user ? u.user.id : null;
  if (!uid) return "Accesso non valido";
  for (const f of files) {
    const foto = await riduciFoto(f);
    const id = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).slice(0, 12);
    const percorso = `${uid}/${id}-${nomeSicuro(foto.name)}`;
    const up = await supabase.storage.from("foto_richieste").upload(percorso, foto, {
      contentType: foto.type || undefined,
      upsert: false,
    });
    if (up.error) return up.error.message;
    const { error } = await supabase
      .from("foto_richieste")
      .insert({ percorso, nome: foto.name, famiglia_id, richiesta_id, manutenzione_id });
    if (error) {
      await supabase.storage.from("foto_richieste").remove([percorso]);
      return error.message;
    }
  }
  return null;
}

export async function urlFoto(percorso) {
  const { data } = await supabase.storage.from("foto_richieste").createSignedUrl(percorso, 3600);
  return data ? data.signedUrl : null;
}
