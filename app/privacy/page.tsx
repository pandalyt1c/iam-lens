import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — IAM Lens",
  description:
    "What IAM Lens collects, what it doesn't, and how to unsubscribe.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12 md:py-20">
      <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
        Privacy
      </h1>

      <div className="flex flex-col gap-4 text-base text-muted-foreground">
        <p>
          <strong className="text-foreground">What I collect.</strong> If you
          submit your email address through the &ldquo;notify me&rdquo; form, I
          store that email address. That&apos;s it.
        </p>
        <p>
          <strong className="text-foreground">What I don&apos;t collect.</strong>{" "}
          No cookies. No analytics. No tracking pixels. No third-party scripts.
          The IAM policies you paste into the tool never leave your browser
          &mdash; parsing and analysis run locally.
        </p>
        <p>
          <strong className="text-foreground">How emails are used.</strong> I
          send one email when a related tool ships. No newsletter, no marketing,
          no sharing with anyone.
        </p>
        <p>
          <strong className="text-foreground">Unsubscribe.</strong> Reply
          &ldquo;unsubscribe&rdquo; to any email I send, or email{" "}
          <a
            href="mailto:privacy@iamlens.dev"
            className="underline underline-offset-2"
          >
            privacy@iamlens.dev
          </a>{" "}
          and I&apos;ll remove your address.
        </p>
        <p>
          <Link href="/" className="underline underline-offset-2">
            ← Back to IAM Lens
          </Link>
        </p>
      </div>
    </main>
  );
}
