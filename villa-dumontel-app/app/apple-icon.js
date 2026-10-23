import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <div style={{ fontSize: 76, fontWeight: 700, display: "flex" }}>VD</div>
        <div style={{ width: 54, height: 2, background: "#b98b4e", marginTop: 6, display: "flex" }} />
      </div>
    ),
    { ...size }
  );
}
