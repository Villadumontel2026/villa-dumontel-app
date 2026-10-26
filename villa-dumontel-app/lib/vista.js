// "Vedi come ospite": l'admin sceglie una famiglia e vede l'app come la vedrebbe lei.
// Lo stato e' salvato nel browser (sessionStorage), solo finche' la scheda resta aperta.

const CHIAVE = "vd_vista";

export function leggiVista() {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(CHIAVE) || "null");
    return v && v.id ? v : null;
  } catch (e) {
    return null;
  }
}

export function impostaVista(famiglia) {
  try {
    window.sessionStorage.setItem(CHIAVE, JSON.stringify({ id: famiglia.id, nome: famiglia.nome }));
  } catch (e) {}
}

export function esciDallaVista() {
  try {
    window.sessionStorage.removeItem(CHIAVE);
  } catch (e) {}
}

// Se l'utente e' admin e la vista e' attiva, restituisce un profilo "ospite" di quella famiglia
export function applicaVista(profilo) {
  if (profilo && profilo.ruolo === "admin") {
    const v = leggiVista();
    if (v) return { ...profilo, ruolo: "ospite", famiglia_id: v.id };
  }
  return profilo;
}
