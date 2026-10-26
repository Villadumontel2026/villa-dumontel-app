import "./globals.css";
import NavBar from "./components/NavBar";
import HomeBar from "./components/HomeBar";
import VistaBanner from "./components/VistaBanner";
import { AppProvider } from "./components/AppProvider";

export const metadata = {
  title: "Villa Dumontel",
  description: "Gestione alloggi e richieste ospiti",
  appleWebApp: {
    capable: true,
    title: "Villa Dumontel",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#2f4739",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <AppProvider>
        <header className="site-header">
          <div className="header-inner">
            <a href="/" className="site-brand">
              <span className="nome">Villa Dumontel</span>
              <span className="luogo">Entrèves &middot; Courmayeur</span>
            </a>
            <NavBar />
          </div>
        </header>
        <VistaBanner />
        <div className="container">
          <HomeBar />
          {children}
        </div>
        </AppProvider>
      </body>
    </html>
  );
}
