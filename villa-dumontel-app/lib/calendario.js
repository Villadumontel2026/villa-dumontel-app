// Utilita' per costruire eventi di calendario (.ics) dalle richieste.
// Gli orari sono interpretati come ora di Roma e scritti in UTC, cosi' sono
// corretti in qualsiasi fuso orario in cui si trovi chi guarda il calendario.

import { DIZ, traduciVoci, traduciSotto } from "./i18n";

const TESTI = {
  it: {
    pulizie: "Pulizie",
    prenotazione: "Prenotazione",
    daAccettare: "DA ACCETTARE",
    daConfermare: "DA CONFERMARE",
    daFare: "Da fare: ",
    persone: " persone",
    note: "Note: ",
    indica: "Indica o modifica cosa fare: ",
    allarme: "Pulizie tra un'ora",
  },
  en: {
    pulizie: "Cleaning",
    prenotazione: "Booking",
    daAccettare: "TO ACCEPT",
    daConfermare: "TO BE CONFIRMED",
    daFare: "To do: ",
    persone: " people",
    note: "Notes: ",
    indica: "Add or edit the cleaning tasks: ",
    allarme: "Cleaning in one hour",
  },
};

const DURATA_DEFAULT_ORE = { trasporto: 1, ristorante: 2, attivita: 2, pulizie: 3 };

const pad = (n) => String(n).padStart(2, "0");

function offsetRomaMinuti(date) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const comeUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (comeUtc - date.getTime()) / 60000;
}

function romaInUtc(y, m, d, hh, mm) {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off1 = offsetRomaMinuti(guess);
  const first = new Date(guess.getTime() - off1 * 60000);
  const off2 = offsetRomaMinuti(first);
  return new Date(guess.getTime() - off2 * 60000);
}

function fmtUtc(dt) {
  return (
    dt.getUTCFullYear() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) +
    "T" +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    pad(dt.getUTCSeconds()) +
    "Z"
  );
}

function fmtData(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() + pad(dt.getUTCMonth() + 1) + pad(dt.getUTCDate());
}

// r: richiesta (con campo opzionale alloggio = nome alloggio)
// opzioni: { ruolo, appUrl }
export function costruisciEvento(r, opzioni = {}) {
  const { ruolo, appUrl } = opzioni;
  const lang = opzioni.lang === "en" ? "en" : "it";
  const X = TESTI[lang];
  const etichetta = (tipo) => DIZ[lang]["tipo." + tipo];
  const [y, m, d] = String(r.data).slice(0, 10).split("-").map(Number);

  let hh = null;
  let mi = 0;
  if (r.ora) {
    const p = String(r.ora).split(":");
    hh = parseInt(p[0], 10);
    mi = parseInt(p[1] || "0", 10);
  }

  const daConfermare = r.stato === "nuova" || r.stato === "in gestione";
  const daAccettare = r.tipo === "pulizie" && ruolo === "collaboratore" && !r.accettata_il;

  let titolo;
  if (r.tipo === "pulizie") {
    titolo = X.pulizie + (r.alloggio ? " · " + r.alloggio : "");
  } else {
    titolo =
      (etichetta(r.tipo) || X.prenotazione) +
      (r.descrizione ? ": " + r.descrizione : r.sotto_tipo ? ": " + traduciSotto(lang, r.sotto_tipo) : "");
  }
  if (daAccettare) titolo = X.daAccettare + " · " + titolo;
  else if (daConfermare) titolo = X.daConfermare + " · " + titolo;

  const righe = [];
  if (r.tipo === "pulizie") {
    if (r.descrizione) righe.push(X.daFare + traduciVoci(lang, r.descrizione, opzioni.taskMap));
  } else if (r.sotto_tipo && r.descrizione) {
    righe.push(traduciSotto(lang, r.sotto_tipo));
  }
  if (r.pax) righe.push(r.pax + X.persone);
  if (r.note) righe.push(X.note + r.note);
  if (r.tipo === "pulizie" && ruolo === "ospite" && appUrl) {
    righe.push(X.indica + appUrl + "/ospite/richieste");
  }
  righe.push("Villa Dumontel");

  const base = {
    id: r.id,
    titolo,
    descrizione: righe.join("\n"),
    luogo: "Villa Dumontel, Via Passerin d'Entrèves 3, Courmayeur",
    tentativo: daConfermare || daAccettare,
    modificata: r.aggiornata_il ? new Date(r.aggiornata_il) : new Date(),
    promemoria: r.tipo === "pulizie",
    testoPromemoria: X.allarme,
  };

  if (hh === null) {
    return {
      ...base,
      tuttoGiorno: true,
      inizioData: fmtData(y, m, d),
      fineData: fmtData(y, m, d + 1),
    };
  }
  const inizio = romaInUtc(y, m, d, hh, mi);
  const minuti = Math.round((r.durata_ore || DURATA_DEFAULT_ORE[r.tipo] || 1) * 60);
  const fine = new Date(inizio.getTime() + minuti * 60000);
  return { ...base, tuttoGiorno: false, inizio, fine };
}

function esc(t) {
  return String(t)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Piega le righe lunghe (limite di 75 caratteri della specifica)
function piega(riga) {
  if (riga.length <= 73) return riga;
  const parti = [];
  let resto = riga;
  parti.push(resto.slice(0, 73));
  resto = resto.slice(73);
  while (resto.length > 0) {
    parti.push(" " + resto.slice(0, 72));
    resto = resto.slice(72);
  }
  return parti.join("\r\n");
}

export function veventDa(ev) {
  const r = [
    "BEGIN:VEVENT",
    "UID:richiesta-" + ev.id + "@villadumontel.it",
    "DTSTAMP:" + fmtUtc(new Date()),
    "LAST-MODIFIED:" + fmtUtc(ev.modificata),
    "SEQUENCE:" + Math.floor(ev.modificata.getTime() / 1000),
    ev.tuttoGiorno ? "DTSTART;VALUE=DATE:" + ev.inizioData : "DTSTART:" + fmtUtc(ev.inizio),
    ev.tuttoGiorno ? "DTEND;VALUE=DATE:" + ev.fineData : "DTEND:" + fmtUtc(ev.fine),
    "SUMMARY:" + esc(ev.titolo),
    "DESCRIPTION:" + esc(ev.descrizione),
    "LOCATION:" + esc(ev.luogo),
    "STATUS:" + (ev.tentativo ? "TENTATIVE" : "CONFIRMED"),
  ];
  if (ev.promemoria && !ev.tuttoGiorno) {
    r.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + esc(ev.testoPromemoria || "Pulizie tra un'ora"),
      "TRIGGER:-PT1H",
      "END:VALARM"
    );
  }
  r.push("END:VEVENT");
  return r.join("\r\n");
}

export function calendarioIcs(eventi, nome = "Villa Dumontel") {
  const testa = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Villa Dumontel//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc(nome),
    "X-WR-TIMEZONE:Europe/Rome",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const corpo = eventi.map(veventDa);
  const testo = [...testa, ...corpo, "END:VCALENDAR"].join("\r\n");
  return testo
    .split("\r\n")
    .map(piega)
    .join("\r\n");
}

export function linkGoogle(ev) {
  const date = ev.tuttoGiorno
    ? ev.inizioData + "/" + ev.fineData
    : fmtUtc(ev.inizio) + "/" + fmtUtc(ev.fine);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.titolo,
    dates: date,
    details: ev.descrizione,
    location: ev.luogo,
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}
