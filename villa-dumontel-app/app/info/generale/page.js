import { T } from "../../components/AppProvider";

export default function InfoGeneralePage() {
  return (
    <main>
      <p>
        <a href="/info">
          <T k="i.back" />
        </a>
      </p>
      <h1>
        <T k="i.gen" />
      </h1>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>
          <T k="i.contatti" />
        </h2>
        <p>
          Joël Désayeux
          <br />
          +39 340 2462592
        </p>
        <p>
          Giorgia Barbieri
          <br />
          +39 346 0987549
        </p>
        <p>villadumontel@gmail.com</p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>
          <T k="i.wifi" />
        </h2>
        <p>
          <T k="i.rete" />: <strong>Villadumontel</strong>
          <br />
          <T k="i.pass" />: <strong>Entreves2023!</strong>
        </p>
      </div>

      <div className="card">
        <h2>
          <T k="i.indirizzo" />
        </h2>
        <p>Via Passerin D&apos;Entrèves, 3, 11013 Courmayeur (AO), Italia</p>
      </div>
    </main>
  );
}
