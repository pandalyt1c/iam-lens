import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getArticle, getArticleSlugs } from "@/lib/learn";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: `${article.title} — IAM Lens`,
    description: article.description,
    alternates: { canonical: `/learn/${slug}` },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 md:py-20">
      <div className="flex flex-col gap-4">
        <Link
          href="/learn"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Learn
        </Link>
        <div className="flex flex-wrap gap-2">
          {article.tags?.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          {article.title}
        </h1>
        <p className="text-lg text-muted-foreground">{article.description}</p>
        <time className="text-sm text-muted-foreground">{article.date}</time>
      </div>
      <hr className="border-border" />
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <MDXRemote source={article.content} />
      </article>
      <hr className="border-border" />
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <p className="font-medium">Try it yourself</p>
        <p className="text-sm text-muted-foreground">
          Paste any IAM policy into IAM Lens to visualize permissions and catch
          risky patterns instantly.
        </p>
        <Link
          href="/"
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Analyze a policy →
        </Link>
      </div>
    </main>
  );
}
