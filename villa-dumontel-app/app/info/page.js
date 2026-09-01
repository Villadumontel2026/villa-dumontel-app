import Link from "next/link";

const SEZIONI = [
  {
    href: "/info/generale",
    titolo: "Informazioni generali",
    descrizione: "Contatti, wifi e indirizzo",
  },
  {
    href: "/info/ristoranti",
    titolo: "Ristoranti",
    descrizione: "Entrèves, Courmayeur, Valle d'Aosta, stellati, estero",
  },
  {
    href: "/info/bar",
    titolo: "Bar",
    descrizione: "Dove prendere un caffè o un aperitivo",
  },
  {
    href: "/info/food-drink",
    titolo: "Food & Drink",
    descrizione: "Catering, gastronomie, macellerie",
  },
  {
    href: "/info/attivita",
    titolo: "Attività",
    descrizione: "Sport, benessere e tempo libero",
  },
];

export default function InfoPage() {
  return (
    <main>
      <p>
        <a href="/">&larr; Home</a>
      </p>
      <h1>Informazioni</h1>
      <p className="muted">
        Tutto quello che serve per organizzare il soggiorno: contatti, ristoranti,
        bar e attività consigliate nei dintorni.
      </p>

      <div style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
        {SEZIONI.map((s) => (
          <Link key={s.href} href={s.href} className="card" style={{ display: "block" }}>
            <h2 style={{ marginBottom: "0.25rem" }}>{s.titolo}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {s.descrizione}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
