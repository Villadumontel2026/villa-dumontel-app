import "./globals.css";

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
            <a href="/" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Villa Dumontel
            </a>
            <nav>
              <a href="/richieste">Richieste</a>
              <a href="/info">Info</a>
              <a href="/login">Accedi</a>
            </nav>
          </div>
        </header>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
