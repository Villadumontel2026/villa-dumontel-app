import Link from "next/link";
import { T } from "../components/AppProvider";

const SEZIONI = [
  { href: "/info/generale", titolo: "i.gen", descrizione: "i.genSub" },
  { href: "/info/ristoranti", titolo: "i.rist", descrizione: "i.ristSub" },
  { href: "/info/bar", titolo: "i.bar", descrizione: "i.barSub" },
  { href: "/info/food-drink", titolo: "i.food", descrizione: "i.foodSub" },
  { href: "/info/attivita", titolo: "i.att", descrizione: "i.attSub" },
];

export default function InfoPage() {
  return (
    <main>
      <h1>
        <T k="i.titolo" />
      </h1>
      <p className="muted">
        <T k="i.intro" />
      </p>

      <div style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
        {SEZIONI.map((s) => (
          <Link key={s.href} href={s.href} className="card" style={{ display: "block" }}>
            <h2 style={{ marginBottom: "0.25rem" }}>
              <T k={s.titolo} />
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              <T k={s.descrizione} />
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
