import { ImageResponse } from "next/og";

// Icona provvisoria (monogramma). Quando il logo e' pronto si sostituisce qui.
export async function GET(request, { params }) {
  const size = Math.min(Math.max(parseInt(params.size, 10) || 512, 64), 1024);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f4739",
          color: "#d9b77e",
        }}
      >
        <div style={{ fontSize: size * 0.42, fontWeight: 700, letterSpacing: size * 0.01, display: "flex" }}>
          VD
        </div>
        <div style={{ width: size * 0.3, height: size * 0.012, background: "#b98b4e", marginTop: size * 0.03, display: "flex" }} />
      </div>
    ),
    { width: size, height: size }
  );
}
