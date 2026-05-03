import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface ArticleFrontmatter {
  title: string;
  description: string;
  date: string;
  tags?: string[];
}

export interface ArticleMeta extends ArticleFrontmatter {
  slug: string;
}

export interface Article extends ArticleMeta {
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "learn");

function readArticleFile(filename: string): Article | null {
  if (!filename.endsWith(".mdx")) return null;
  const slug = filename.replace(/\.mdx$/, "");
  const fullPath = path.join(CONTENT_DIR, filename);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  const fm = data as Partial<ArticleFrontmatter>;
  if (!fm.title || !fm.description || !fm.date) return null;
  return {
    slug,
    title: fm.title,
    description: fm.description,
    date: fm.date,
    tags: fm.tags ?? [],
    content,
  };
}

export function getAllArticles(): ArticleMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .map(readArticleFile)
    .filter((a): a is Article => a !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(({ content: _content, ...meta }) => meta);
}

export function getArticle(slug: string): Article | null {
  const filename = `${slug}.mdx`;
  const fullPath = path.join(CONTENT_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  return readArticleFile(filename);
}

export function getArticleSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
