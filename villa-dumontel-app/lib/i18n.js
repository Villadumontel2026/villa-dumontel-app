// Dizionari e utilita' per le lingue dell'app.
// Per aggiungere il francese: aggiungere "fr" in LINGUE e un blocco "fr" in DIZ
// (le chiavi mancanti ricadono sull'italiano).

export const LINGUE = ["it", "en"];
export const LINGUA_DEFAULT = "it";

const it = {
  // Menu
  "nav.home": "Home",
  "nav.prenota": "Prenota",
  "nav.mieRichieste": "Richieste",
  "nav.richieste": "Richieste",
  "nav.pulizie": "Pulizie",
  "nav.spese": "Spese",
  "nav.riepilogo": "Riepilogo",
  "nav.calendario": "Calendario",
  "nav.info": "Info",
  "nav.novita": "Novità",
  "nav.account": "Account",
  "nav.esci": "Esci",
  "nav.accedi": "Accedi",
  "nav.menu": "Menu ☰",
  "nav.chiudi": "Chiudi ✕",
  "nav.menuLabel": "Menu",

  // Comuni
  "c.caricamento": "Caricamento...",
  "c.loginRichiesto": "Devi accedere per vedere questa pagina.",
  "c.vaiLogin": "Vai al login →",
  "c.soloOspiti": "Questa pagina è riservata agli ospiti.",
  "c.errore": "Errore: ",
  "c.salva": "Salva",
  "c.annulla": "Annulla",
  "c.persone": "pers.",
  "c.ore": "ore",
  "c.durata": "durata",
  "c.altro": "Altro",

  // Tipi, stati
  "tipo.trasporto": "Trasporto",
  "tipo.ristorante": "Ristorante",
  "tipo.attivita": "Attività",
  "tipo.pulizie": "Pulizie",
  "stato.inviata": "Inviata",
  "stato.prenotata": "Prenotata",
  "stato.completata": "Completata",
  "stato.annullata": "Annullata",
  "sotto.pranzo": "Pranzo",
  "sotto.cena": "Cena",
  "voce.Cambio lenzuola": "Cambio lenzuola",
  "voce.Cambio asciugamani": "Cambio asciugamani",
  "voce.Pulizia bagni": "Pulizia bagni",
  "voce.Pulizia cucina": "Pulizia cucina",
  "voce.Pulizia terrazzo/balcone": "Pulizia terrazzo/balcone",
  "voce.Riordino generale": "Riordino generale",

  "pm.titolo": "Proposta di modifica",
  "pm.da": "Da",
  "pm.a": "a",
  "pm.accetta": "Accetta",
  "pm.rifiuta": "Rifiuta",
  "pm.home": "Hai una proposta di modifica da valutare.",
  "pm.vedi": "Valuta",
  "cv.mese": "Mese",
  "cv.settimana": "Settimana",
  "cv.giorno": "Giorno",
  "cv.oggi": "Oggi",
  "cv.modifica": "Modifica",
  "cv.annulla": "Annulla",
  "cv.nessuno": "Nessun evento.",
  "cv.legenda": "Pieno = confermato · contorno = da confermare. Tocca un giorno o un evento per modificarlo o annullarlo.",
  "cv.avvisoAdmin": "L'ospite (e la collaboratrice, per le pulizie) verranno avvisati della modifica.",
  "cv.avvisoOspite": "Lo staff della villa verrà avvisato della modifica; se la richiesta era confermata tornerà in attesa di conferma.",
  "av.titolo": "Avvisi",
  "av.letti": "Segna come letti",
  "av.apri": "Apri",
  "cal.mioTitolo": "Il mio calendario",
  "cal.abbonamento": "Abbonamento al calendario del telefono",
  "nov.titolo": "Novità",
  "nov.vuoto": "Nessuna novità per ora.",
  "nov.vedi": "Vedi tutte le novità →",
  "nov.apri": "Scopri di più →",
  "nuovo.badge": "Nuovo",

  // Pagina pubblica
  "pub.titolo": "Benvenuti a Villa Dumontel",
  "pub.testo":
    "Il vostro appoggio a Entrèves: prenotate trasporti, ristoranti, attività e pulizie, seguite i costi e trovate tutte le informazioni utili per il soggiorno.",
  "pub.accedi": "Accedi",
  "pub.info": "Informazioni sul soggiorno",

  // Login
  "login.titolo": "Accedi",
  "login.tabPassword": "Password",
  "login.tabLink": "Link per email",
  "login.email": "Email",
  "login.password": "Password",
  "login.accedi": "Accedi",
  "login.errore": "Email o password non corrette.",
  "login.hint":
    'Non hai ancora una password? Usa "Link per email"; una volta dentro potrai impostarla da Account.',
  "login.inviaLink": "Invia link di accesso",
  "login.inviato": "Controlla la tua email: ti abbiamo inviato un link per accedere.",
  "dl.titolo": "Accesso",
  "dl.verifica": "Verifica in corso...",
  "dl.noProfilo": "Accesso riuscito, ma non hai ancora un profilo associato. Contatta l'amministratore.",

  // Account
  "acc.titolo": "Il mio account",
  "acc.collegato": "Collegato come",
  "acc.imposta": "Imposta una password",
  "acc.perche": "Così puoi entrare senza aspettare il link per email.",
  "acc.nuova": "Nuova password",
  "acc.ripeti": "Ripeti la password",
  "acc.salva": "Salva password",
  "acc.corta": "La password deve avere almeno 8 caratteri.",
  "acc.diverse": "Le due password non coincidono.",
  "acc.ok": "Password salvata. Da ora puoi accedere anche con email e password.",
  "acc.lingua": "Lingua",

  // Home ospite
  "oh.benvenuti": "Benvenuti",
  "oh.alloggio": "Alloggio",
  "oh.cosaFare": "Cosa desiderate fare?",
  "oh.reminder1": "Pulizie il {data}",
  "oh.reminder2": "Non hai ancora indicato cosa fare.",
  "oh.reminder3": "Indicalo ora →",
  "oh.azPrenota": "Prenota",
  "oh.azPrenotaSub": "Trasporti, ristoranti, attività, pulizie",
  "oh.azRichieste": "Le mie richieste",
  "oh.azRichiesteSub": "{inviate} inviate · {prenotate} prenotate",
  "oh.azCosti": "I miei costi",
  "oh.azCostiSub": "Spese, versamenti e saldo",
  "oh.azCalendario": "Calendario",
  "oh.azCalendarioSub": "Aggiungi tutto al tuo calendario",
  "oh.azInfo": "Informazioni",
  "oh.azInfoSub": "Contatti, Wi-fi, ristoranti e attività",
  "oh.prossimi": "Prossimi appuntamenti",
  "oh.nessunoProssimo": "Nessun appuntamento prenotato per ora.",
  "oh.inAttesa": "in attesa di conferma",
  "oh.tutte": "Vedi tutte le richieste →",

  // Prenota
  "pr.titolo": "Prenota",
  "pr.inviata": "Richiesta inviata. Ti risponderemo al più presto.",
  "pr.vedi": "Vedi le tue richieste →",
  "pr.invia": "Invia richiesta",

  // Richieste ospite
  "ro.titolo": "Le mie richieste",
  "ro.inCorso": "In corso",
  "ro.nessuna": "Nessuna richiesta in corso.",
  "ro.chiuse": "Completate e annullate",
  "ro.annulla": "Annulla richiesta",
  "ro.confermaAnnulla": "Vuoi annullare questa richiesta?",
  "ro.indica": "Indica cosa fare",
  "ro.noteChi": "Note per chi fa le pulizie",
  "ro.accettata": "accettata dalla collaboratrice",

  // Costi ospite
  "co.titolo": "I miei costi",
  "co.anno": "Anno",
  "co.riporto": "Riporto anni precedenti",
  "co.spese": "Spese",
  "co.versamenti": "Versamenti",
  "co.daVersare": "Da versare",
  "co.credito": "Credito",
  "co.pari": "Saldo in pari",
  "co.nessunaSpesa": "Nessuna spesa.",
  "co.nessunVersamento": "Nessun versamento.",

  // Calendario
  "cal.titolo": "Calendario",
  "cal.intro":
    "Abbonati una volta sola: prenotazioni, pulizie e modifiche compaiono e si aggiornano da sole nel calendario del tuo telefono o del tuo computer.",
  "cal.apple": "iPhone, iPad e Mac",
  "cal.appleBtn": "Abbonati con Apple Calendar",
  "cal.google": "Google Calendar e Outlook",
  "cal.googleTesto": "Copia il link e aggiungilo come calendario da URL:",
  "cal.copia": "Copia il link",
  "cal.copiato": "Copiato!",
  "cal.googleHow": "(da computer): Altri calendari, poi «+», poi «Da URL», incolla il link.",
  "cal.outlookHow": ": Aggiungi calendario, poi «Sottoscrivi da Web», incolla il link.",
  "cal.refresh":
    "Google aggiorna i calendari in abbonamento ogni qualche ora, Apple più spesso. Per avere un promemoria prima di un evento, imposta le notifiche del calendario.",
  "cal.personale": "Link personale",
  "cal.personaleTesto":
    "Non condividerlo: chi lo ha può vedere i tuoi appuntamenti. Se pensi che sia finito in mani sbagliate, genera un nuovo link.",
  "cal.rigenera": "Genera un nuovo link",
  "cal.confermaRigenera":
    "Il vecchio link smetterà di funzionare e dovrai rifare l'abbonamento. Continuare?",
  "cal.aggiungi": "Aggiungi al calendario",
  "cal.google2": "Google Calendar",

  // Prenota button
  "pb.prenota": "Prenota",

  // Form richiesta
  "f.cosa": "Cosa desideri prenotare",
  "f.alloggio": "Alloggio",
  "f.direzione": "Direzione",
  "f.tratta": "Indica la tratta",
  "f.data": "Data",
  "f.orarioVolo": "Orario volo",
  "f.passeggeri": "Numero passeggeri",
  "f.ristorante": "Ristorante",
  "f.pasto": "Pasto",
  "f.ora": "Ora",
  "f.persone": "Numero persone",
  "f.attivita": "Attività",
  "f.partecipanti": "Numero partecipanti",
  "f.scegli": "— scegli dalla lista —",
  "f.altroScrivo": "Altro (scrivo a mano)",
  "f.indicaQuale": "Indica quale",
  "f.dataDesiderata": "Data desiderata",
  "f.oraInizio": "Ora di inizio",
  "f.collab": "Collaboratrice (facoltativa)",
  "f.daAssegnare": "— da assegnare —",
  "f.durata": "Durata prevista (ore)",
  "f.cosaServe": "Cosa serve",
  "f.note": "Note",

  // Info
  "i.titolo": "Informazioni",
  "i.intro":
    "Tutto quello che serve per organizzare il soggiorno: contatti, ristoranti, bar e attività consigliate nei dintorni.",
  "i.back": "← Informazioni",
  "i.gen": "Informazioni generali",
  "i.genSub": "Contatti, wifi e indirizzo",
  "i.rist": "Ristoranti",
  "i.ristSub": "Entrèves, Courmayeur, Valle d'Aosta, stellati, estero",
  "i.bar": "Bar",
  "i.barSub": "Dove prendere un caffè o un aperitivo",
  "i.food": "Food & Drink",
  "i.foodSub": "Catering, gastronomie, macellerie",
  "i.att": "Attività",
  "i.attSub": "Sport, benessere e tempo libero",
  "i.contatti": "Contatti",
  "i.wifi": "Wi-fi",
  "i.rete": "Rete",
  "i.pass": "Password",
  "i.indirizzo": "Indirizzo",
  "i.sito": "Sito web",
};

const en = {
  "nav.home": "Home",
  "nav.prenota": "Book",
  "nav.mieRichieste": "My requests",
  "nav.richieste": "Requests",
  "nav.pulizie": "Cleaning",
  "nav.spese": "Expenses",
  "nav.riepilogo": "Summary",
  "nav.calendario": "Calendar",
  "nav.info": "Info",
  "nav.novita": "News",
  "nav.account": "Account",
  "nav.esci": "Log out",
  "nav.accedi": "Log in",
  "nav.menu": "Menu ☰",
  "nav.chiudi": "Close ✕",
  "nav.menuLabel": "Menu",

  "c.caricamento": "Loading...",
  "c.loginRichiesto": "Please log in to see this page.",
  "c.vaiLogin": "Go to login →",
  "c.soloOspiti": "This page is for guests only.",
  "c.errore": "Error: ",
  "c.salva": "Save",
  "c.annulla": "Cancel",
  "c.persone": "people",
  "c.ore": "hours",
  "c.durata": "duration",
  "c.altro": "Other",

  "tipo.trasporto": "Transfer",
  "tipo.ristorante": "Restaurant",
  "tipo.attivita": "Activity",
  "tipo.pulizie": "Cleaning",
  "stato.inviata": "Sent",
  "stato.prenotata": "Booked",
  "stato.completata": "Completed",
  "stato.annullata": "Cancelled",
  "sotto.pranzo": "Lunch",
  "sotto.cena": "Dinner",
  "voce.Cambio lenzuola": "Change bed linen",
  "voce.Cambio asciugamani": "Change towels",
  "voce.Pulizia bagni": "Clean bathrooms",
  "voce.Pulizia cucina": "Clean kitchen",
  "voce.Pulizia terrazzo/balcone": "Clean terrace/balcony",
  "voce.Riordino generale": "General tidying",

  "pm.titolo": "Proposed change",
  "pm.da": "From",
  "pm.a": "to",
  "pm.accetta": "Accept",
  "pm.rifiuta": "Decline",
  "pm.home": "You have a proposed change to review.",
  "pm.vedi": "Review",
  "cv.mese": "Month",
  "cv.settimana": "Week",
  "cv.giorno": "Day",
  "cv.oggi": "Today",
  "cv.modifica": "Edit",
  "cv.annulla": "Cancel",
  "cv.nessuno": "No events.",
  "cv.legenda": "Solid = confirmed · outline = awaiting confirmation. Tap a day or an event to edit or cancel it.",
  "cv.avvisoAdmin": "The guest (and the cleaner, for cleaning) will be notified of the change.",
  "cv.avvisoOspite": "The villa team will be notified of the change; if the request was confirmed it will go back to awaiting confirmation.",
  "av.titolo": "Notices",
  "av.letti": "Mark as read",
  "av.apri": "Open",
  "cal.mioTitolo": "My calendar",
  "cal.abbonamento": "Subscribe on your phone's calendar",
  "nov.titolo": "What's new",
  "nov.vuoto": "Nothing new for now.",
  "nov.vedi": "See all news →",
  "nov.apri": "Find out more →",
  "nuovo.badge": "New",

  "pub.titolo": "Welcome to Villa Dumontel",
  "pub.testo":
    "Your home in Entrèves: book transfers, restaurants, activities and cleaning, follow your costs and find all the useful information for your stay.",
  "pub.accedi": "Log in",
  "pub.info": "Information about your stay",

  "login.titolo": "Log in",
  "login.tabPassword": "Password",
  "login.tabLink": "Email link",
  "login.email": "Email",
  "login.password": "Password",
  "login.accedi": "Log in",
  "login.errore": "Incorrect email or password.",
  "login.hint":
    'No password yet? Use "Email link"; once inside you can set a password from Account.',
  "login.inviaLink": "Send login link",
  "login.inviato": "Check your email: we have sent you a link to log in.",
  "dl.titolo": "Logging in",
  "dl.verifica": "Checking...",
  "dl.noProfilo": "Login successful, but you do not have a profile yet. Please contact the administrator.",

  "acc.titolo": "My account",
  "acc.collegato": "Logged in as",
  "acc.imposta": "Set a password",
  "acc.perche": "This way you can log in without waiting for the email link.",
  "acc.nuova": "New password",
  "acc.ripeti": "Repeat the password",
  "acc.salva": "Save password",
  "acc.corta": "The password must be at least 8 characters long.",
  "acc.diverse": "The two passwords do not match.",
  "acc.ok": "Password saved. From now on you can also log in with email and password.",
  "acc.lingua": "Language",

  "oh.benvenuti": "Welcome",
  "oh.alloggio": "Apartment",
  "oh.cosaFare": "What would you like to do?",
  "oh.reminder1": "Cleaning on {data}",
  "oh.reminder2": "You have not yet said what needs to be done.",
  "oh.reminder3": "Tell us now →",
  "oh.azPrenota": "Book",
  "oh.azPrenotaSub": "Transfers, restaurants, activities, cleaning",
  "oh.azRichieste": "My requests",
  "oh.azRichiesteSub": "{inviate} sent · {prenotate} booked",
  "oh.azCosti": "My costs",
  "oh.azCostiSub": "Expenses, payments and balance",
  "oh.azCalendario": "Calendar",
  "oh.azCalendarioSub": "Add everything to your calendar",
  "oh.azInfo": "Information",
  "oh.azInfoSub": "Contacts, Wi-fi, restaurants and activities",
  "oh.prossimi": "Upcoming appointments",
  "oh.nessunoProssimo": "No bookings for now.",
  "oh.inAttesa": "awaiting confirmation",
  "oh.tutte": "See all requests →",

  "pr.titolo": "Book",
  "pr.inviata": "Request sent. We will get back to you as soon as possible.",
  "pr.vedi": "See your requests →",
  "pr.invia": "Send request",

  "ro.titolo": "My requests",
  "ro.inCorso": "In progress",
  "ro.nessuna": "No requests in progress.",
  "ro.chiuse": "Completed and cancelled",
  "ro.annulla": "Cancel request",
  "ro.confermaAnnulla": "Do you want to cancel this request?",
  "ro.indica": "Tell us what to do",
  "ro.noteChi": "Notes for the cleaner",
  "ro.accettata": "accepted by the cleaner",

  "co.titolo": "My costs",
  "co.anno": "Year",
  "co.riporto": "Carried over from previous years",
  "co.spese": "Expenses",
  "co.versamenti": "Payments",
  "co.daVersare": "Amount due",
  "co.credito": "Credit",
  "co.pari": "Balanced",
  "co.nessunaSpesa": "No expenses.",
  "co.nessunVersamento": "No payments.",

  "cal.titolo": "Calendar",
  "cal.intro":
    "Subscribe once: bookings, cleaning and changes appear and update by themselves in the calendar of your phone or computer.",
  "cal.apple": "iPhone, iPad and Mac",
  "cal.appleBtn": "Subscribe with Apple Calendar",
  "cal.google": "Google Calendar and Outlook",
  "cal.googleTesto": "Copy the link and add it as a calendar from URL:",
  "cal.copia": "Copy the link",
  "cal.copiato": "Copied!",
  "cal.googleHow": "(on a computer): Other calendars, then «+», then «From URL», paste the link.",
  "cal.outlookHow": ": Add calendar, then «Subscribe from web», paste the link.",
  "cal.refresh":
    "Google refreshes subscribed calendars every few hours, Apple more often. To get a reminder before an event, set up notifications in your calendar.",
  "cal.personale": "Personal link",
  "cal.personaleTesto":
    "Do not share it: anyone with it can see your appointments. If you think it has fallen into the wrong hands, generate a new link.",
  "cal.rigenera": "Generate a new link",
  "cal.confermaRigenera":
    "The old link will stop working and you will need to subscribe again. Continue?",
  "cal.aggiungi": "Add to calendar",
  "cal.google2": "Google Calendar",

  "pb.prenota": "Book",

  "f.cosa": "What would you like to book",
  "f.alloggio": "Apartment",
  "f.direzione": "Direction",
  "f.tratta": "Specify the route",
  "f.data": "Date",
  "f.orarioVolo": "Flight time",
  "f.passeggeri": "Number of passengers",
  "f.ristorante": "Restaurant",
  "f.pasto": "Meal",
  "f.ora": "Time",
  "f.persone": "Number of people",
  "f.attivita": "Activity",
  "f.partecipanti": "Number of participants",
  "f.scegli": "— choose from the list —",
  "f.altroScrivo": "Other (I will write it)",
  "f.indicaQuale": "Please specify",
  "f.dataDesiderata": "Preferred date",
  "f.oraInizio": "Start time",
  "f.collab": "Cleaner (optional)",
  "f.daAssegnare": "— to be assigned —",
  "f.durata": "Expected duration (hours)",
  "f.cosaServe": "What is needed",
  "f.note": "Notes",

  "i.titolo": "Information",
  "i.intro":
    "Everything you need to organise your stay: contacts, restaurants, bars and recommended activities nearby.",
  "i.back": "← Information",
  "i.gen": "General information",
  "i.genSub": "Contacts, wifi and address",
  "i.rist": "Restaurants",
  "i.ristSub": "Entrèves, Courmayeur, Aosta Valley, Michelin-starred, abroad",
  "i.bar": "Bars",
  "i.barSub": "Where to get a coffee or an aperitif",
  "i.food": "Food & Drink",
  "i.foodSub": "Catering, delicatessens, butchers",
  "i.att": "Activities",
  "i.attSub": "Sports, wellness and leisure",
  "i.contatti": "Contacts",
  "i.wifi": "Wi-fi",
  "i.rete": "Network",
  "i.pass": "Password",
  "i.indirizzo": "Address",
  "i.sito": "Website",
};

export const DIZ = { it, en };

export function tradurre(lang, chiave, vars) {
  let s = (DIZ[lang] && DIZ[lang][chiave]) ?? it[chiave] ?? chiave;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      s = s.split("{" + k + "}").join(String(vars[k]));
    });
  }
  return s;
}

const LOCALE = { it: "it-IT", en: "en-GB" };

export function locale(lang) {
  return LOCALE[lang] || "it-IT";
}

// "2026-12-05" -> "ven 5 dic 2026" / "Fri 5 Dec 2026"
export function fmtData(lang, iso, conAnno = true) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y) return String(iso);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return dt.toLocaleDateString(locale(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: conAnno ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function fmtEuro(lang, n) {
  return Number(n || 0).toLocaleString(locale(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// "pranzo" -> "Lunch"; valori sconosciuti restano com'erano
export function traduciSotto(lang, s) {
  if (!s) return s;
  const k = "sotto." + String(s).toLowerCase();
  return (DIZ[lang] && DIZ[lang][k]) || (DIZ.it[k] && lang === "it" ? DIZ.it[k] : null) || s;
}

// "Cambio lenzuola, Pulizia bagni" -> "Change bed linen, Clean bathrooms"
export function traduciVoci(lang, testo) {
  if (!testo) return testo;
  return String(testo)
    .split(", ")
    .map((v) => {
      const k = "voce." + v;
      return (DIZ[lang] && DIZ[lang][k]) || v;
    })
    .join(", ");
}
