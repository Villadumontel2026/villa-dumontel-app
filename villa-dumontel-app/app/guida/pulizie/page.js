import GuidaVista from "../GuidaVista";

export const metadata = { title: "Villa Dumontel - guida per le collaboratrici" };

export default function Pagina() {
  return (
    <GuidaVista
      titolo={"Villa Dumontel"}
      sotto={"App per le collaboratrici - guida rapida"}
      qrTesto={"Inquadra il codice per aprire subito l'app"}
      passi={[
  [
    "Accedi",
    "Riceverai un'email di invito da accesso@villadumontel.it: tocca il link e sei dentro. Le volte dopo apri l'app e usa la scheda \"Link per email\", oppure imposta una password da Account."
  ],
  [
    "Metti l'app sul telefono",
    "iPhone: apri l'app in Safari, tocca il pulsante Condividi e poi \"Aggiungi alla schermata Home\". Android: aprila in Chrome, tocca il menu (tre puntini) e poi \"Installa app\" o \"Aggiungi a schermata Home\"."
  ],
  [
    "Attiva le notifiche",
    "Apri l'app dall'icona, vai in Account > Notifiche sul telefono e attivale (su iPhone funziona solo con l'app sulla schermata Home). Così ti avvisiamo di nuove pulizie e modifiche."
  ],
  [
    "Accetta le pulizie",
    "In Pulizie, sotto \"Da accettare\", trovi le nuove richieste con data, alloggio e cose da fare. Indica la durata prevista in ore e tocca Accetta."
  ],
  [
    "Segnala il turno svolto",
    "Dopo la pulizia tocca \"Segnala un turno\": scegli data e alloggio, inserisci le ore e le attività svolte e invia. Il turno resta \"da validare\" finché non lo conferma l'amministratore."
  ],
  [
    "Controlla il tuo saldo",
    "In Pulizie vedi il totale dovuto per i turni validati, quanto hai già ricevuto e il saldo residuo, oltre all'elenco dei tuoi turni."
  ]
]}
      nota={"Domande? Scrivi a villadumontel@gmail.com."}
    />
  );
}
