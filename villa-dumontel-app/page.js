export default function InfoGeneralePage() {
  return (
    <main>
      <p>
        <a href="/info">&larr; Informazioni</a>
      </p>
      <h1>Informazioni generali</h1>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Contatti</h2>
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
        <h2>Wi-fi</h2>
        <p>
          Rete: <strong>Villadumontel</strong>
          <br />
          Password: <strong>Entreves2023!</strong>
        </p>
      </div>

      <div className="card">
        <h2>Indirizzo</h2>
        <p>Via Passerin D&apos;Entrèves, 3, 11013 Courmayeur (AO), Italia</p>
      </div>
    </main>
  );
}
