import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GitBranch, MessageSquareText, ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12 md:py-20">
      <header className="flex flex-col items-start gap-4">
        <Badge variant="secondary" className="rounded-full">
          Weekend 1 · scaffold
        </Badge>
        <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          IAM Lens
        </h1>
        <p className="text-lg text-muted-foreground md:text-xl">
          Turn AWS IAM policies into visual clarity.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <label
          htmlFor="policy-input"
          className="text-sm font-medium text-foreground"
        >
          Policy JSON
        </label>
        <Textarea
          id="policy-input"
          placeholder="Paste an IAM policy JSON here..."
          className="min-h-64 font-mono text-sm"
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Nothing leaves your browser yet — analysis wiring lands next session.
          </p>
          <Button disabled size="lg">
            Analyze Policy
          </Button>
        </div>
      </section>

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
    </main>
  );
}
