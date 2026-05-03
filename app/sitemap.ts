import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/learn";

export const dynamic = "force-static";

const SITE = "https://iamlens.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const articles = getAllArticles().map((a) => ({
    url: `${SITE}/learn/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: SITE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE}/learn`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...articles,
  ];
}
