"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { examples, type ExampleCategory } from "@/lib/parser";

const CATEGORY_LABEL: Record<ExampleCategory, string> = {
  "least-privilege": "Least privilege",
  "read-only": "Read-only",
  "service-role": "Service roles",
  "cross-account": "Cross-account",
  dangerous: "Dangerous",
  deny: "Deny / guardrails",
};

const CATEGORY_ORDER: ExampleCategory[] = [
  "least-privilege",
  "read-only",
  "service-role",
  "cross-account",
  "deny",
  "dangerous",
];

export function ExamplesPicker({
  onPick,
}: {
  onPick: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: examples.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="size-3" aria-hidden />
        ) : (
          <ChevronRight className="size-3" aria-hidden />
        )}
        {open ? "Hide examples" : `Browse ${examples.length} examples`}
      </button>

      {open && (
        <div className="flex flex-col gap-3 rounded-md border border-border/60 p-4">
          {grouped.map((g) => (
            <div key={g.category} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {CATEGORY_LABEL[g.category]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {g.items.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.items.map((ex) => (
                  <Button
                    key={ex.slug}
                    size="sm"
                    variant="outline"
                    onClick={() => onPick(ex.slug)}
                    title={ex.description}
                  >
                    {ex.title}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
