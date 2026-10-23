"use client";

const ETICHETTE = {
  trasporto: "Trasporto",
  ristorante: "Ristorante",
  attivita: "Attività",
  pulizie: "Pulizie",
};

const DURATA_ORE = { trasporto: 1, ristorante: 2, attivita: 2, pulizie: 2 };

const pad = (n) => String(n).padStart(2, "0");

function parti(data, ora) {
  const [y, m, d] = String(data).slice(0, 10).split("-").map(Number);
  let hh = null;
  let mm = null;
  if (ora) {
    const p = String(ora).split(":");
    hh = parseInt(p[0], 10);
    mm = parseInt(p[1] || "0", 10);
  }
  return { y, m, d, hh, mm };
}

function formatoLocale(dt) {
  return (
    dt.getFullYear() +
    pad(dt.getMonth() + 1) +
    pad(dt.getDate()) +
    "T" +
    pad(dt.getHours()) +
    pad(dt.getMinutes()) +
    "00"
  );
}

function formatoData(dt) {
  return dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate());
}

function costruisci(r) {
  const { y, m, d, hh, mm } = parti(r.data, r.ora);
  const titolo =
    (ETICHETTE[r.tipo] || "Prenotazione") +
    (r.descrizione ? ": " + r.descrizione : r.sotto_tipo ? ": " + r.sotto_tipo : "");
  const dettagli = [
    r.sotto_tipo && r.descrizione ? r.sotto_tipo : null,
    r.pax ? r.pax + " persone" : null,
    r.note || null,
    "Prenotazione tramite Villa Dumontel",
  ]
    .filter(Boolean)
    .join(" - ");

  if (hh === null) {
    const inizio = new Date(y, m - 1, d);
    const fine = new Date(y, m - 1, d + 1);
    return { titolo, dettagli, tuttoGiorno: true, inizio, fine };
  }
  const inizio = new Date(y, m - 1, d, hh, mm);
  const fine = new Date(y, m - 1, d, hh + (DURATA_ORE[r.tipo] || 1), mm);
  return { titolo, dettagli, tuttoGiorno: false, inizio, fine };
}

function esc(t) {
  return String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function creaIcs(ev, id) {
  const righe = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Villa Dumontel//IT",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:richiesta-" + id + "@villadumontel",
    "DTSTAMP:" + formatoLocale(new Date()),
    ev.tuttoGiorno
      ? "DTSTART;VALUE=DATE:" + formatoData(ev.inizio)
      : "DTSTART:" + formatoLocale(ev.inizio),
    ev.tuttoGiorno
      ? "DTEND;VALUE=DATE:" + formatoData(ev.fine)
      : "DTEND:" + formatoLocale(ev.fine),
    "SUMMARY:" + esc(ev.titolo),
    "DESCRIPTION:" + esc(ev.dettagli),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return righe.join("\r\n");
}

function linkGoogle(ev) {
  const date = ev.tuttoGiorno
    ? formatoData(ev.inizio) + "/" + formatoData(ev.fine)
    : formatoLocale(ev.inizio) + "/" + formatoLocale(ev.fine);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.titolo,
    dates: date,
    details: ev.dettagli,
    ctz: "Europe/Rome",
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

export default function CalendarButton({ richiesta }) {
  if (!richiesta || !richiesta.data) return null;
  const ev = costruisci(richiesta);

  function scarica() {
    const blob = new Blob([creaIcs(ev, richiesta.id)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "villa-dumontel-" + richiesta.id + ".ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <button type="button" onClick={scarica}>
        Aggiungi al calendario
      </button>
      <a href={linkGoogle(ev)} target="_blank" rel="noreferrer">
        <button type="button">Google Calendar</button>
      </a>
    </span>
  );
}
