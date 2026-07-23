export const metadata = {
  title: "Villa Dumontel",
  description: "Gestione alloggi e richieste ospiti",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body style={{ fontFamily: "sans-serif", margin: "2rem" }}>
        {children}
      </body>
    </html>
  );
}
