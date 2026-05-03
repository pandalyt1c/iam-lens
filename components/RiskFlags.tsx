import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RiskFlag, RiskSeverity } from "@/lib/parser";

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_VARIANT: Record<
  RiskSeverity,
  "default" | "secondary" | "destructive" | "outline"
> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export function RiskFlags({ flags }: { flags: RiskFlag[] }) {
  const sorted = [...flags].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <Card>
      <CardHeader>
        {sorted.length === 0 ? (
          <ShieldCheck
            className="size-5 text-muted-foreground"
            aria-hidden
          />
        ) : (
          <ShieldAlert
            className="size-5 text-muted-foreground"
            aria-hidden
          />
        )}
        <CardTitle>Risk Flags</CardTitle>
        <CardDescription>
          {sorted.length === 0
            ? "No common risk patterns detected. This is not a guarantee — review manually for business logic."
            : `${sorted.length} potential issue${sorted.length === 1 ? "" : "s"} found.`}
        </CardDescription>
      </CardHeader>
      {sorted.length > 0 && (
        <CardContent className="flex flex-col gap-3">
          {sorted.map((flag) => (
            <div
              key={flag.id}
              className="rounded-md border border-border/60 p-4 text-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={SEVERITY_VARIANT[flag.severity]}>
                  {flag.severity}
                </Badge>
                <span className="font-medium">{flag.title}</span>
                <span className="text-xs text-muted-foreground">
                  Statement #{flag.statementIndex + 1}
                </span>
              </div>
              <p className="text-muted-foreground">{flag.detail}</p>
              {flag.fix && (
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Suggested fix: </span>
                  <span className="text-muted-foreground">{flag.fix}</span>
                </p>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
