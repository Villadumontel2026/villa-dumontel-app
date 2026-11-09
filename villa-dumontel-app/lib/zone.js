// Utilita' per le zone (utilizzabile sia da server che da client)
export function slugGruppo(nome) {
  return "zona-" + String(nome).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
