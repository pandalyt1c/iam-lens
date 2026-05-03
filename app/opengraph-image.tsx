import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "IAM Lens — AWS IAM Policy Visualizer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 28,
            color: "#a1a1aa",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background:
                "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%)",
            }}
          />
          iamlens.dev
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            <div style={{ display: "flex" }}>Turn AWS IAM policies</div>
            <div style={{ display: "flex" }}>into visual clarity.</div>
          </div>
          <div style={{ fontSize: 32, color: "#a1a1aa" }}>
            Graph + plain English + risk flags. Free. Runs in your browser.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
