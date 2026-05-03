import Link from "next/link";
import type { Metadata } from "next";
import { getAllArticles } from "@/lib/learn";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Learn IAM — IAM Lens",
  description:
    "Plain-English guides to AWS IAM: wildcards, privilege escalation, trust policies, and least-privilege patterns.",
  alternates: { canonical: "/learn" },
};

export default function LearnIndex() {
  const articles = getAllArticles();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <Badge variant="secondary" className="self-start rounded-full">
          Learn
        </Badge>
        <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          AWS IAM, demystified
        </h1>
        <p className="text-lg text-muted-foreground md:text-xl">
          Short, opinionated guides to the IAM patterns that actually matter in
          production.
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-muted-foreground">
          No articles yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((a) => (
            <Link key={a.slug} href={`/learn/${a.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-foreground/40">
                <CardHeader>
                  <CardTitle className="text-lg">{a.title}</CardTitle>
                  <CardDescription>{a.description}</CardDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.tags?.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
