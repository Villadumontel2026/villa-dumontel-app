import "./globals.css";
import NavBar from "./components/NavBar";

export const metadata = {
  title: "Villa Dumontel",
  description: "Gestione alloggi e richieste ospiti",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <a href="/" className="site-brand">
              <span className="nome">Villa Dumontel</span>
              <span className="luogo">Entrèves &middot; Courmayeur</span>
            </a>
            <NavBar />
          </div>
        </header>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
