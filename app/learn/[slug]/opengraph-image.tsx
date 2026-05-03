import { ImageResponse } from "next/og";
import { getArticle, getArticleSlugs } from "@/lib/learn";

export const dynamic = "force-static";
export const alt = "IAM Lens article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

type Params = Promise<{ slug: string }>;

export default async function Image(props: { params: Params }) {
  const { slug } = await props.params;
  const article = getArticle(slug);
  const title = article?.title ?? "IAM Lens";
  const description =
    article?.description ?? "AWS IAM, demystified.";

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
          iamlens.dev / learn
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#a1a1aa",
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
