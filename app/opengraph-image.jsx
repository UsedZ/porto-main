import { ImageResponse } from "next/og";

export const alt = "Syahrul Ramlan — IT Support, IoT & Web Development";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Kartu sosial statis: dipakai untuk Open Graph dan Twitter. */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f6f3",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#22c55e",
              color: "#0a0a0c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            SR
          </div>
          <div style={{ fontSize: 26, color: "#6b6b6b", letterSpacing: 2 }}>
            PORTFOLIO — 2026
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              color: "#111111",
              lineHeight: 1.05,
            }}
          >
            Syahrul Ramlan
          </div>
          <div style={{ fontSize: 40, color: "#3f6b52" }}>
            IT Support · IoT · Web Development
          </div>
          <div style={{ fontSize: 28, color: "#6b6b6b", maxWidth: 900 }}>
            Saya menjaga sistem tetap jalan, menghubungkan perangkat ke jaringan,
            dan membangun antarmuka yang membuat datanya terbaca.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#8a8a8a" }}>
          Jakarta, Indonesia
        </div>
      </div>
    ),
    size
  );
}
