import type { ParsedPolicy, ParsedStatement } from "./types";

export type RiskSeverity = "critical" | "high" | "medium" | "low";

export interface RiskFlag {
  id: string;
  severity: RiskSeverity;
  title: string;
  detail: string;
  statementIndex: number;
  fix?: string;
}

const PRIV_ESC_ACTIONS = new Set([
  "iam:createpolicy",
  "iam:createpolicyversion",
  "iam:setdefaultpolicyversion",
  "iam:attachuserpolicy",
  "iam:attachrolepolicy",
  "iam:attachgrouppolicy",
  "iam:putuserpolicy",
  "iam:putrolepolicy",
  "iam:putgrouppolicy",
  "iam:createaccesskey",
  "iam:updateassumerolepolicy",
  "iam:passrole",
  "sts:assumerole",
]);

const SENSITIVE_REQUIRES_CONDITION = new Set([
  "iam:passrole",
  "sts:assumerole",
]);

function actionMatches(action: string, target: string): boolean {
  const a = action.toLowerCase();
  if (a === "*") return true;
  if (a === target) return true;
  if (a.endsWith(":*")) {
    const service = a.slice(0, -2);
    return target.startsWith(service + ":");
  }
  return false;
}

function hasWildcardAction(s: ParsedStatement): boolean {
  return s.actions.some((a) => a === "*" || a.endsWith(":*"));
}

function hasWildcardResource(s: ParsedStatement): boolean {
  return s.resources.some((r) => r === "*");
}

function hasPublicPrincipal(s: ParsedStatement): boolean {
  return s.principals.some((p) => p.kind === "Wildcard" || p.value === "*");
}

export function analyze(policy: ParsedPolicy): RiskFlag[] {
  const flags: RiskFlag[] = [];

  policy.statements.forEach((s, i) => {
    if (s.effect !== "Allow") return;

    const wildcardAction = hasWildcardAction(s);
    const wildcardResource = hasWildcardResource(s);
    const noConditions = s.conditions.length === 0;

    if (wildcardAction && wildcardResource && noConditions) {
      flags.push({
        id: `admin-${i}`,
        severity: "critical",
        title: "Full administrative access",
        detail:
          "This statement allows every action on every resource with no conditions. It is equivalent to AdministratorAccess.",
        statementIndex: i,
        fix: "Replace `*` with the specific actions and resource ARNs the principal actually needs.",
      });
    } else {
      if (wildcardAction) {
        flags.push({
          id: `wildcard-action-${i}`,
          severity: "high",
          title: "Wildcard action",
          detail: `Action ${s.actions
            .filter((a) => a === "*" || a.endsWith(":*"))
            .join(", ")} grants every API call in scope.`,
          statementIndex: i,
          fix: "List only the specific actions required (e.g. `s3:GetObject` instead of `s3:*`).",
        });
      }
      if (wildcardResource && !wildcardAction) {
        flags.push({
          id: `wildcard-resource-${i}`,
          severity: "medium",
          title: "Wildcard resource",
          detail:
            "Resource is `*`, meaning the listed actions apply to every resource in the account.",
          statementIndex: i,
          fix: "Scope the resource to specific ARNs where possible.",
        });
      }
    }

    if (s.isNotAction) {
      flags.push({
        id: `not-action-${i}`,
        severity: "high",
        title: "Allow with NotAction",
        detail:
          "Allow + NotAction grants everything except the listed actions, which often permits far more than intended.",
        statementIndex: i,
        fix: "Rewrite as Allow + Action with an explicit allowlist.",
      });
    }

    if (s.isNotResource) {
      flags.push({
        id: `not-resource-${i}`,
        severity: "medium",
        title: "Allow with NotResource",
        detail:
          "Allow + NotResource grants the listed actions on every resource except those named — easy to under-scope.",
        statementIndex: i,
        fix: "Rewrite as Allow + Resource with an explicit list of ARNs.",
      });
    }

    if (hasPublicPrincipal(s)) {
      flags.push({
        id: `public-principal-${i}`,
        severity: "critical",
        title: "Public principal",
        detail:
          "Principal `*` means anyone on the internet can invoke the listed actions on the resource.",
        statementIndex: i,
        fix: "Restrict Principal to specific AWS account IDs, roles, or services.",
      });
    }

    for (const sensitive of SENSITIVE_REQUIRES_CONDITION) {
      if (s.actions.some((a) => actionMatches(a, sensitive)) && noConditions) {
        flags.push({
          id: `sensitive-no-condition-${sensitive}-${i}`,
          severity: "high",
          title: `${sensitive} without conditions`,
          detail: `${sensitive} is a known privilege-escalation vector and should be gated by a Condition (e.g. iam:PassedToService, aws:SourceArn).`,
          statementIndex: i,
          fix: "Add a Condition restricting which roles or services may use this action.",
        });
      }
    }

    const escActions = s.actions.filter((a) => {
      const lower = a.toLowerCase();
      if (lower === "*" || lower.endsWith(":*")) return false;
      return PRIV_ESC_ACTIONS.has(lower);
    });
    if (escActions.length > 0 && !flags.some((f) => f.id === `admin-${i}`)) {
      flags.push({
        id: `priv-esc-${i}`,
        severity: "high",
        title: "Privilege escalation action",
        detail: `${escActions.join(
          ", ",
        )} can be chained to grant the principal more access than intended.`,
        statementIndex: i,
        fix: "Limit to specific roles/policies via Resource ARN and add a Condition.",
      });
    }
  });

  return flags;
}
