"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  GitBranch,
  MessageSquareText,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import {
  parse,
  summarize,
  analyze,
  examples,
  type ParsedPolicy,
  type ParseError,
  type RiskFlag,
} from "@/lib/parser";
import { PolicyGraph } from "@/components/PolicyGraph";
import { RiskFlags } from "@/components/RiskFlags";
import { ExamplesPicker } from "@/components/ExamplesPicker";
import { EmailCapture } from "@/components/EmailCapture";
import { buildShareUrl, readPolicyFromUrl } from "@/lib/share";

type AnalysisState =
  | { status: "idle" }
  | {
      status: "ok";
      policy: ParsedPolicy;
      summary: string;
      flags: RiskFlag[];
    }
  | { status: "error"; error: ParseError };

export default function Home() {
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  useEffect(() => {
    const fromUrl = readPolicyFromUrl();
    if (fromUrl) {
      setInput(fromUrl);
      runAnalysis(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyShareLink() {
    try {
      const url = buildShareUrl(input);
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, "", url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      setShareStatus("error");
      setTimeout(() => setShareStatus("idle"), 2000);
    }
  }

  function runAnalysis(text: string) {
    const result = parse(text);
    if (!result.ok) {
      setAnalysis({ status: "error", error: result.error });
      return;
    }
    setAnalysis({
      status: "ok",
      policy: result.policy,
      summary: summarize(result.policy),
      flags: analyze(result.policy),
    });
  }

  function loadExample(slug: string) {
    const ex = examples.find((e) => e.slug === slug);
    if (!ex) return;
    setInput(ex.policy);
    runAnalysis(ex.policy);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12 md:py-20">
      <header className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Free · Client-side · No signup
        </p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          IAM Lens
        </h1>
        <p className="text-lg text-muted-foreground md:text-xl">
          Turn AWS IAM policies into visual clarity.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label
            htmlFor="policy-input"
            className="text-sm font-medium text-foreground"
          >
            Policy JSON
          </label>
          <ExamplesPicker onPick={loadExample} />
        </div>

        <Textarea
          id="policy-input"
          placeholder="Paste an IAM policy JSON here..."
          className="min-h-64 font-mono text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Nothing leaves your browser — parsing runs locally.
          </p>
          <div className="flex items-center gap-2">
            {analysis.status === "ok" && (
              <Button
                size="lg"
                variant="outline"
                onClick={copyShareLink}
                disabled={input.trim().length === 0}
              >
                {shareStatus === "copied"
                  ? "Link copied"
                  : shareStatus === "error"
                    ? "Copy failed"
                    : "Share link"}
              </Button>
            )}
            <Button
              size="lg"
              disabled={input.trim().length === 0}
              onClick={() => runAnalysis(input)}
            >
              Analyze Policy
            </Button>
          </div>
        </div>
      </section>

      {analysis.status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Could not parse policy ({analysis.error.code})</AlertTitle>
          <AlertDescription>
            {analysis.error.message}
            {analysis.error.path && (
              <span className="text-muted-foreground"> at {analysis.error.path}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {analysis.status === "ok" && (
        <section className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <MessageSquareText
                className="size-5 text-muted-foreground"
                aria-hidden
              />
              <CardTitle>Plain English</CardTitle>
              <CardDescription>{analysis.summary}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <GitBranch
                className="size-5 text-muted-foreground"
                aria-hidden
              />
              <CardTitle>Visual Graph</CardTitle>
              <CardDescription>
                Principals → statements → actions → resources. Drag nodes to
                rearrange.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PolicyGraph policy={analysis.policy} />
            </CardContent>
          </Card>

          <RiskFlags flags={analysis.flags} />

          <Card>
            <CardHeader>
              <CardTitle>Statements</CardTitle>
              <CardDescription>
                {analysis.policy.statements.length} statement
                {analysis.policy.statements.length === 1 ? "" : "s"}
                {analysis.policy.version
                  ? ` · version ${analysis.policy.version}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {analysis.policy.statements.map((s, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border/60 p-4 text-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={s.effect === "Allow" ? "default" : "destructive"}
                    >
                      {s.effect}
                    </Badge>
                    {s.sid && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.sid}
                      </span>
                    )}
                    {s.conditions.length > 0 && (
                      <Badge variant="secondary">
                        {s.conditions.length} condition
                        {s.conditions.length === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                    {s.principals.length > 0 && (
                      <>
                        <dt className="text-muted-foreground">Principal</dt>
                        <dd>
                          {s.principals
                            .map((p) => `${p.kind}: ${p.value}`)
                            .join(", ")}
                        </dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">
                      {s.isNotAction ? "NotAction" : "Action"}
                    </dt>
                    <dd className="break-all">{s.actions.join(", ") || "—"}</dd>
                    <dt className="text-muted-foreground">
                      {s.isNotResource ? "NotResource" : "Resource"}
                    </dt>
                    <dd className="break-all">
                      {s.resources.join(", ") || "—"}
                    </dd>
                  </dl>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {analysis.status === "idle" && (
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <GitBranch
                className="size-5 text-muted-foreground"
                aria-hidden
              />
              <CardTitle>Visual Graph</CardTitle>
              <CardDescription>
                See principals, actions, and resources as an interactive graph.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquareText
                className="size-5 text-muted-foreground"
                aria-hidden
              />
              <CardTitle>Plain English</CardTitle>
              <CardDescription>
                Read what the policy actually does, statement by statement.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <ShieldAlert
                className="size-5 text-muted-foreground"
                aria-hidden
              />
              <CardTitle>Risk Flags</CardTitle>
              <CardDescription>
                Spot wildcards, privilege escalation paths, and missing conditions.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}

      <EmailCapture />
    </main>
  );
}
