import GuidaVista from "./GuidaVista";

export const metadata = { title: "Villa Dumontel - guest guide" };

export default function Pagina() {
  return (
    <GuidaVista
      titolo={"Villa Dumontel"}
      sotto={"Your guest app - quick guide"}
      qrTesto={"Scan the code to open the app straight away"}
      passi={[
  [
    "Log in",
    "You will receive an invitation email from accesso@villadumontel.it. Tap the link in it and you are in. Next time, open the app and use the \"Email link\" tab, or set a password from Account."
  ],
  [
    "Add the app to your phone",
    "iPhone: open the app in Safari, tap the Share button, then \"Add to Home Screen\". Android: open it in Chrome, tap the menu (three dots), then \"Install app\" or \"Add to Home screen\"."
  ],
  [
    "Turn on notifications",
    "Open the app from its icon, go to Account > Phone notifications and tap to enable them (on iPhone this works only once the app is on the Home Screen). In Account you can also choose which emails you want to receive."
  ],
  [
    "Book what you need",
    "Tap Book to request transfers, restaurants, activities or cleaning. We confirm your requests and you receive a notice. Under My requests you can follow, change or cancel them."
  ],
  [
    "Everything else",
    "My costs: expenses, payments and balance. Calendar: add your bookings to your own calendar. Information: contacts, Wi-fi, restaurants and activities. Top-right you can switch language."
  ]
]}
      nota={"Need help? Write to villadumontel@gmail.com. Enjoy your stay!"}
    />
  );
}
