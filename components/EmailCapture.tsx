"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

const COOLDOWN_SECONDS = 60;

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting" || cooldown > 0) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong. Try again?");
        return;
      }
      setStatus("success");
      setEmail("");
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setStatus("error");
      setError("Network error. Try again?");
    }
  }

  const disabled = status === "submitting" || cooldown > 0;

  return (
    <section className="border-t border-border/60 pt-10">
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Get notified about new tools
        </h2>
        <p className="text-sm text-muted-foreground">
          I&apos;m building related security tooling. One email when something
          ships. No newsletter, no spam.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:items-start"
        >
          <label htmlFor="email-capture" className="sr-only">
            Email address
          </label>
          <input
            id="email-capture"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none transition-colors",
              "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
              "sm:max-w-sm",
            )}
          />
          <Button type="submit" disabled={disabled || email.trim().length === 0}>
            {status === "submitting"
              ? "Sending..."
              : cooldown > 0
                ? `Wait ${cooldown}s`
                : "Notify me"}
          </Button>
        </form>

        {status === "success" && (
          <p className="text-sm text-foreground" role="status">
            Thanks. You&apos;ll hear from me when there&apos;s something to ship.
          </p>
        )}
        {status === "error" && error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          I store your email and nothing else.{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
