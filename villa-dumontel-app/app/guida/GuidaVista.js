const QR_N = 31;
const QR_PATH = "M1 1h1v1h-1zM2 1h1v1h-1zM3 1h1v1h-1zM4 1h1v1h-1zM5 1h1v1h-1zM6 1h1v1h-1zM7 1h1v1h-1zM9 1h1v1h-1zM11 1h1v1h-1zM23 1h1v1h-1zM24 1h1v1h-1zM25 1h1v1h-1zM26 1h1v1h-1zM27 1h1v1h-1zM28 1h1v1h-1zM29 1h1v1h-1zM1 2h1v1h-1zM7 2h1v1h-1zM11 2h1v1h-1zM17 2h1v1h-1zM20 2h1v1h-1zM21 2h1v1h-1zM23 2h1v1h-1zM29 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1zM4 3h1v1h-1zM5 3h1v1h-1zM7 3h1v1h-1zM10 3h1v1h-1zM13 3h1v1h-1zM14 3h1v1h-1zM16 3h1v1h-1zM17 3h1v1h-1zM18 3h1v1h-1zM20 3h1v1h-1zM21 3h1v1h-1zM23 3h1v1h-1zM25 3h1v1h-1zM26 3h1v1h-1zM27 3h1v1h-1zM29 3h1v1h-1zM1 4h1v1h-1zM3 4h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM7 4h1v1h-1zM9 4h1v1h-1zM10 4h1v1h-1zM13 4h1v1h-1zM15 4h1v1h-1zM16 4h1v1h-1zM17 4h1v1h-1zM19 4h1v1h-1zM20 4h1v1h-1zM23 4h1v1h-1zM25 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM29 4h1v1h-1zM1 5h1v1h-1zM3 5h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM7 5h1v1h-1zM9 5h1v1h-1zM11 5h1v1h-1zM13 5h1v1h-1zM14 5h1v1h-1zM15 5h1v1h-1zM17 5h1v1h-1zM19 5h1v1h-1zM23 5h1v1h-1zM25 5h1v1h-1zM26 5h1v1h-1zM27 5h1v1h-1zM29 5h1v1h-1zM1 6h1v1h-1zM7 6h1v1h-1zM9 6h1v1h-1zM11 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM14 6h1v1h-1zM15 6h1v1h-1zM16 6h1v1h-1zM20 6h1v1h-1zM23 6h1v1h-1zM29 6h1v1h-1zM1 7h1v1h-1zM2 7h1v1h-1zM3 7h1v1h-1zM4 7h1v1h-1zM5 7h1v1h-1zM6 7h1v1h-1zM7 7h1v1h-1zM9 7h1v1h-1zM11 7h1v1h-1zM13 7h1v1h-1zM15 7h1v1h-1zM17 7h1v1h-1zM19 7h1v1h-1zM21 7h1v1h-1zM23 7h1v1h-1zM24 7h1v1h-1zM25 7h1v1h-1zM26 7h1v1h-1zM27 7h1v1h-1zM28 7h1v1h-1zM29 7h1v1h-1zM9 8h1v1h-1zM10 8h1v1h-1zM11 8h1v1h-1zM13 8h1v1h-1zM15 8h1v1h-1zM18 8h1v1h-1zM19 8h1v1h-1zM20 8h1v1h-1zM21 8h1v1h-1zM1 9h1v1h-1zM5 9h1v1h-1zM7 9h1v1h-1zM8 9h1v1h-1zM9 9h1v1h-1zM10 9h1v1h-1zM12 9h1v1h-1zM14 9h1v1h-1zM15 9h1v1h-1zM16 9h1v1h-1zM17 9h1v1h-1zM18 9h1v1h-1zM21 9h1v1h-1zM22 9h1v1h-1zM23 9h1v1h-1zM24 9h1v1h-1zM25 9h1v1h-1zM26 9h1v1h-1zM29 9h1v1h-1zM3 10h1v1h-1zM4 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM10 10h1v1h-1zM18 10h1v1h-1zM19 10h1v1h-1zM22 10h1v1h-1zM23 10h1v1h-1zM24 10h1v1h-1zM25 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM28 10h1v1h-1zM29 10h1v1h-1zM2 11h1v1h-1zM4 11h1v1h-1zM5 11h1v1h-1zM6 11h1v1h-1zM7 11h1v1h-1zM12 11h1v1h-1zM14 11h1v1h-1zM15 11h1v1h-1zM16 11h1v1h-1zM18 11h1v1h-1zM19 11h1v1h-1zM21 11h1v1h-1zM23 11h1v1h-1zM24 11h1v1h-1zM25 11h1v1h-1zM29 11h1v1h-1zM1 12h1v1h-1zM2 12h1v1h-1zM3 12h1v1h-1zM11 12h1v1h-1zM12 12h1v1h-1zM14 12h1v1h-1zM16 12h1v1h-1zM17 12h1v1h-1zM18 12h1v1h-1zM21 12h1v1h-1zM22 12h1v1h-1zM25 12h1v1h-1zM26 12h1v1h-1zM28 12h1v1h-1zM29 12h1v1h-1zM7 13h1v1h-1zM8 13h1v1h-1zM10 13h1v1h-1zM11 13h1v1h-1zM14 13h1v1h-1zM18 13h1v1h-1zM19 13h1v1h-1zM21 13h1v1h-1zM22 13h1v1h-1zM28 13h1v1h-1zM1 14h1v1h-1zM2 14h1v1h-1zM3 14h1v1h-1zM4 14h1v1h-1zM6 14h1v1h-1zM8 14h1v1h-1zM11 14h1v1h-1zM14 14h1v1h-1zM15 14h1v1h-1zM17 14h1v1h-1zM18 14h1v1h-1zM19 14h1v1h-1zM23 14h1v1h-1zM25 14h1v1h-1zM26 14h1v1h-1zM27 14h1v1h-1zM28 14h1v1h-1zM29 14h1v1h-1zM1 15h1v1h-1zM4 15h1v1h-1zM7 15h1v1h-1zM11 15h1v1h-1zM12 15h1v1h-1zM13 15h1v1h-1zM17 15h1v1h-1zM19 15h1v1h-1zM21 15h1v1h-1zM22 15h1v1h-1zM24 15h1v1h-1zM26 15h1v1h-1zM27 15h1v1h-1zM29 15h1v1h-1zM1 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM12 16h1v1h-1zM15 16h1v1h-1zM18 16h1v1h-1zM21 16h1v1h-1zM23 16h1v1h-1zM24 16h1v1h-1zM28 16h1v1h-1zM29 16h1v1h-1zM1 17h1v1h-1zM3 17h1v1h-1zM5 17h1v1h-1zM7 17h1v1h-1zM10 17h1v1h-1zM11 17h1v1h-1zM12 17h1v1h-1zM13 17h1v1h-1zM14 17h1v1h-1zM15 17h1v1h-1zM16 17h1v1h-1zM17 17h1v1h-1zM18 17h1v1h-1zM20 17h1v1h-1zM22 17h1v1h-1zM24 17h1v1h-1zM28 17h1v1h-1zM1 18h1v1h-1zM4 18h1v1h-1zM5 18h1v1h-1zM6 18h1v1h-1zM8 18h1v1h-1zM9 18h1v1h-1zM12 18h1v1h-1zM18 18h1v1h-1zM19 18h1v1h-1zM23 18h1v1h-1zM24 18h1v1h-1zM25 18h1v1h-1zM26 18h1v1h-1zM28 18h1v1h-1zM29 18h1v1h-1zM3 19h1v1h-1zM5 19h1v1h-1zM6 19h1v1h-1zM7 19h1v1h-1zM9 19h1v1h-1zM10 19h1v1h-1zM11 19h1v1h-1zM12 19h1v1h-1zM13 19h1v1h-1zM14 19h1v1h-1zM15 19h1v1h-1zM16 19h1v1h-1zM18 19h1v1h-1zM24 19h1v1h-1zM27 19h1v1h-1zM29 19h1v1h-1zM4 20h1v1h-1zM8 20h1v1h-1zM14 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM19 20h1v1h-1zM21 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM28 20h1v1h-1zM29 20h1v1h-1zM1 21h1v1h-1zM2 21h1v1h-1zM5 21h1v1h-1zM6 21h1v1h-1zM7 21h1v1h-1zM11 21h1v1h-1zM12 21h1v1h-1zM13 21h1v1h-1zM14 21h1v1h-1zM18 21h1v1h-1zM20 21h1v1h-1zM21 21h1v1h-1zM22 21h1v1h-1zM23 21h1v1h-1zM24 21h1v1h-1zM25 21h1v1h-1zM26 21h1v1h-1zM29 21h1v1h-1zM9 22h1v1h-1zM11 22h1v1h-1zM14 22h1v1h-1zM15 22h1v1h-1zM17 22h1v1h-1zM20 22h1v1h-1zM21 22h1v1h-1zM25 22h1v1h-1zM29 22h1v1h-1zM1 23h1v1h-1zM2 23h1v1h-1zM3 23h1v1h-1zM4 23h1v1h-1zM5 23h1v1h-1zM6 23h1v1h-1zM7 23h1v1h-1zM9 23h1v1h-1zM10 23h1v1h-1zM11 23h1v1h-1zM13 23h1v1h-1zM17 23h1v1h-1zM18 23h1v1h-1zM19 23h1v1h-1zM20 23h1v1h-1zM21 23h1v1h-1zM23 23h1v1h-1zM25 23h1v1h-1zM26 23h1v1h-1zM27 23h1v1h-1zM29 23h1v1h-1zM1 24h1v1h-1zM7 24h1v1h-1zM11 24h1v1h-1zM15 24h1v1h-1zM18 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM25 24h1v1h-1zM28 24h1v1h-1zM29 24h1v1h-1zM1 25h1v1h-1zM3 25h1v1h-1zM4 25h1v1h-1zM5 25h1v1h-1zM7 25h1v1h-1zM9 25h1v1h-1zM11 25h1v1h-1zM13 25h1v1h-1zM14 25h1v1h-1zM15 25h1v1h-1zM16 25h1v1h-1zM17 25h1v1h-1zM19 25h1v1h-1zM20 25h1v1h-1zM21 25h1v1h-1zM22 25h1v1h-1zM23 25h1v1h-1zM24 25h1v1h-1zM25 25h1v1h-1zM26 25h1v1h-1zM28 25h1v1h-1zM29 25h1v1h-1zM1 26h1v1h-1zM3 26h1v1h-1zM4 26h1v1h-1zM5 26h1v1h-1zM7 26h1v1h-1zM10 26h1v1h-1zM12 26h1v1h-1zM18 26h1v1h-1zM19 26h1v1h-1zM21 26h1v1h-1zM22 26h1v1h-1zM24 26h1v1h-1zM28 26h1v1h-1zM1 27h1v1h-1zM3 27h1v1h-1zM4 27h1v1h-1zM5 27h1v1h-1zM7 27h1v1h-1zM11 27h1v1h-1zM12 27h1v1h-1zM13 27h1v1h-1zM14 27h1v1h-1zM16 27h1v1h-1zM19 27h1v1h-1zM22 27h1v1h-1zM26 27h1v1h-1zM27 27h1v1h-1zM28 27h1v1h-1zM29 27h1v1h-1zM1 28h1v1h-1zM7 28h1v1h-1zM13 28h1v1h-1zM14 28h1v1h-1zM16 28h1v1h-1zM17 28h1v1h-1zM21 28h1v1h-1zM26 28h1v1h-1zM28 28h1v1h-1zM29 28h1v1h-1zM1 29h1v1h-1zM2 29h1v1h-1zM3 29h1v1h-1zM4 29h1v1h-1zM5 29h1v1h-1zM6 29h1v1h-1zM7 29h1v1h-1zM9 29h1v1h-1zM13 29h1v1h-1zM14 29h1v1h-1zM21 29h1v1h-1zM25 29h1v1h-1zM26 29h1v1h-1zM28 29h1v1h-1z";

export default function GuidaVista({ titolo, sotto, qrTesto, passi, nota }) {
  return (
    <main>
      <h1>{titolo}</h1>
      <p className="muted">{sotto}</p>

      <div className="card" style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap", maxWidth: 640 }}>
        <svg viewBox={`0 0 ${QR_N} ${QR_N}`} width="150" height="150" shapeRendering="crispEdges" role="img" aria-label="QR code">
          <rect width={QR_N} height={QR_N} fill="#fff" />
          <path d={QR_PATH} fill="#2f4739" />
        </svg>
        <div>
          <strong>{qrTesto}</strong>
          <p style={{ margin: "0.4rem 0 0" }}>
            <a href="/">app.villadumontel.it</a>
          </p>
        </div>
      </div>

      <ol style={{ maxWidth: 640, marginTop: "1.5rem", paddingLeft: "1.25rem" }}>
        {passi.map(([h, t]) => (
          <li key={h} style={{ marginBottom: "1rem" }}>
            <strong>{h}</strong>
            <div className="muted">{t}</div>
          </li>
        ))}
      </ol>

      <p className="muted">{nota}</p>
    </main>
  );
}
