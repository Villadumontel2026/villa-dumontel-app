import { T } from "../components/AppProvider";
import NovitaAdminBox from "../components/NovitaAdminBox";
import InfoCards from "../components/InfoCards";

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

      <div style={{ marginTop: "1.5rem" }}>
        <NovitaAdminBox />
      </div>

      <InfoCards sezioni={SEZIONI} />
    </main>
  );
}
