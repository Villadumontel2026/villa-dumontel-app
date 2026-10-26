// "Vedi come...": l'admin sceglie una famiglia (ospite) o una collaboratrice e vede l'app
// come la vedrebbe lei. Stato salvato nel browser (sessionStorage), solo finche' la scheda resta aperta.

const CHIAVE = "vd_vista";

export function leggiVista() {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(CHIAVE) || "null");
    return v && v.id ? { tipo: "ospite", ...v } : null;
  } catch (e) {
    return null;
  }
}

// tipo: "ospite" (id = famiglia) oppure "collaboratore" (id = collaboratrice)
export function impostaVista(tipo, elemento) {
  try {
    window.sessionStorage.setItem(
      CHIAVE,
      JSON.stringify({ tipo, id: elemento.id, nome: elemento.nome })
    );
  } catch (e) {}
}

export function esciDallaVista() {
  try {
    window.sessionStorage.removeItem(CHIAVE);
  } catch (e) {}
}

// Se l'utente e' admin e la vista e' attiva, restituisce il profilo "visto" dall'altro ruolo
export function applicaVista(profilo) {
  if (profilo && profilo.ruolo === "admin") {
    const v = leggiVista();
    if (v && v.tipo === "collaboratore") {
      return { ...profilo, ruolo: "collaboratore", collaboratore_id: v.id };
    }
    if (v) return { ...profilo, ruolo: "ospite", famiglia_id: v.id };
  }
  return profilo;
}
