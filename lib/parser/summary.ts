import type { ParsedPolicy } from "./types";

export function summarize(policy: ParsedPolicy): string {
  if (policy.statements.length === 0) {
    return "Empty policy — no statements defined.";
  }
  for (const matcher of matchers) {
    const result = matcher(policy);
    if (result) return result;
  }
  return describeGeneric(policy);
}

const READ_VERBS = [
  "Get",
  "List",
  "Describe",
  "Read",
  "View",
  "Lookup",
  "Search",
  "Query",
  "Head",
  "BatchGet",
];

function isReadAction(action: string): boolean {
  if (action === "*") return false;
  const verb = action.split(":")[1] ?? "";
  return READ_VERBS.some((rv) => verb.startsWith(rv));
}

function serviceOf(action: string): string | null {
  if (action === "*") return null;
  const idx = action.indexOf(":");
  return idx > 0 ? action.slice(0, idx) : null;
}

function isWildcard(values: string[]): boolean {
  return values.length === 1 && values[0] === "*";
}

function uniqueServices(actions: string[]): string[] {
  const set = new Set<string>();
  for (const a of actions) {
    const svc = serviceOf(a);
    if (svc) set.add(svc);
  }
  return [...set];
}

function extractS3Buckets(resources: string[]): string[] {
  const buckets = new Set<string>();
  for (const r of resources) {
    const m = r.match(/^arn:aws:s3:::([^/]+)/);
    if (m) buckets.add(m[1]);
  }
  return [...buckets];
}

function extractLambdaFunctions(resources: string[]): string[] {
  const fns = new Set<string>();
  for (const r of resources) {
    const m = r.match(/^arn:aws:lambda:[^:]*:[^:]*:function:([^:]+)/);
    if (m) fns.add(m[1]);
  }
  return [...fns];
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function matchTrustPolicy(p: ParsedPolicy): string | null {
  if (p.statements.length !== 1) return null;
  const s = p.statements[0];
  if (s.effect !== "Allow") return null;
  if (s.principals.length === 0) return null;
  if (s.resources.length !== 0) return null;
  if (s.actions.length === 0) return null;
  const isAssumeRole = s.actions.every(
    (a) => a === "sts:AssumeRole" || a.startsWith("sts:AssumeRoleWith"),
  );
  if (!isAssumeRole) return null;

  const principal = s.principals[0];
  if (principal.kind === "Service") {
    const name = capitalize(principal.value.split(".")[0]);
    return `Trust policy: lets the ${name} service assume this role.`;
  }
  if (principal.kind === "AWS") {
    return `Trust policy: lets ${principal.value} assume this role.`;
  }
  if (principal.kind === "Federated") {
    return `Trust policy: lets federated identities from ${principal.value} assume this role.`;
  }
  if (principal.kind === "Wildcard") {
    return "Trust policy: open to any principal — review carefully.";
  }
  return "Trust policy: defines who can assume this role.";
}

function matchFullAdmin(p: ParsedPolicy): string | null {
  for (const s of p.statements) {
    if (
      s.effect === "Allow" &&
      !s.isNotAction &&
      !s.isNotResource &&
      isWildcard(s.actions) &&
      isWildcard(s.resources)
    ) {
      return "Grants full administrator access to all AWS services and resources — review carefully.";
    }
  }
  return null;
}

function matchPassRoleWildcard(p: ParsedPolicy): string | null {
  for (const s of p.statements) {
    if (s.effect !== "Allow" || s.isNotAction) continue;
    if (!s.actions.includes("iam:PassRole")) continue;
    if (!isWildcard(s.resources)) continue;
    const consumer = uniqueServices(s.actions).find((svc) => svc !== "iam");
    const target = consumer ? consumer.toUpperCase() : "AWS services";
    return `Allows passing any IAM role to ${target} — a known privilege-escalation pattern. Resource should be scoped to specific role ARNs.`;
  }
  return null;
}

function matchMfaGuardrail(p: ParsedPolicy): string | null {
  if (p.statements.length !== 1) return null;
  const s = p.statements[0];
  if (s.effect !== "Deny" || !s.isNotAction) return null;
  const hasMfa = s.conditions.some(
    (c) => c.key === "aws:MultiFactorAuthPresent",
  );
  if (!hasMfa) return null;
  return "Denies all actions except MFA-related ones when MFA is not present. Acts as a guardrail; pair with a permissive Allow.";
}

function matchCrossAccountReadOnly(p: ParsedPolicy): string | null {
  if (p.statements.length !== 1) return null;
  const s = p.statements[0];
  if (s.effect !== "Allow" || s.principals.length === 0) return null;
  const aws = s.principals.find((pr) => pr.kind === "AWS");
  if (!aws) return null;
  const m =
    aws.value.match(/^arn:aws:iam::(\d{12}):root$/) ??
    aws.value.match(/^(\d{12})$/);
  if (!m) return null;
  const accountId = m[1];
  if (s.actions.length === 0 || !s.actions.every(isReadAction)) return null;
  const services = uniqueServices(s.actions);
  if (services.length !== 1) return null;
  const service = services[0];
  if (service === "s3") {
    const buckets = extractS3Buckets(s.resources);
    if (buckets.length === 1) {
      return `Grants account ${accountId} read access to the ${buckets[0]} S3 bucket.`;
    }
  }
  return `Grants account ${accountId} read access to ${service.toUpperCase()} resources.`;
}

function matchSingleServiceWildcardResource(p: ParsedPolicy): string | null {
  if (p.statements.length !== 1) return null;
  const s = p.statements[0];
  if (s.effect !== "Allow" || s.isNotAction) return null;
  if (!isWildcard(s.resources)) return null;
  const services = uniqueServices(s.actions);
  if (services.length !== 1) return null;
  const service = services[0];
  const allRead = s.actions.every(isReadAction);
  if (allRead && service === "ec2") {
    return "Allows read-only inspection of EC2 inventory across the account.";
  }
  if (allRead) {
    return `Allows read-only access to ${service.toUpperCase()} across the account.`;
  }
  return `Allows ${service.toUpperCase()} actions across the account.`;
}

function matchSpecificResource(p: ParsedPolicy): string | null {
  const allow = p.statements.filter(
    (s) => s.effect === "Allow" && !s.isNotAction && !s.isNotResource,
  );
  if (allow.length === 0) return null;
  const allActions = allow.flatMap((s) => s.actions);
  const allResources = allow.flatMap((s) => s.resources);
  if (allActions.length === 0 || allActions.includes("*")) return null;
  const services = uniqueServices(allActions);
  if (services.length !== 1) return null;
  const service = services[0];
  const allRead = allActions.every(isReadAction);

  if (service === "s3") {
    const buckets = extractS3Buckets(allResources);
    if (buckets.length === 1) {
      return allRead
        ? `Allows read access to objects in the ${buckets[0]} S3 bucket.`
        : `Allows access to the ${buckets[0]} S3 bucket.`;
    }
  }
  if (service === "lambda") {
    const fns = extractLambdaFunctions(allResources);
    if (fns.length === 1) {
      if (
        allActions.length === 1 &&
        allActions[0] === "lambda:InvokeFunction"
      ) {
        return `Allows invoking the ${fns[0]} Lambda function.`;
      }
      return `Allows access to the ${fns[0]} Lambda function.`;
    }
  }
  return null;
}

function describeGeneric(p: ParsedPolicy): string {
  const allow = p.statements.filter((s) => s.effect === "Allow").length;
  const deny = p.statements.filter((s) => s.effect === "Deny").length;
  if (allow && deny) {
    return `Policy contains ${allow} Allow and ${deny} Deny statement(s) across multiple services.`;
  }
  if (deny) {
    return `Policy denies ${deny} action set${deny === 1 ? "" : "s"}.`;
  }
  return `Policy allows ${allow} action set${allow === 1 ? "" : "s"}.`;
}

const matchers: Array<(p: ParsedPolicy) => string | null> = [
  matchTrustPolicy,
  matchFullAdmin,
  matchPassRoleWildcard,
  matchMfaGuardrail,
  matchCrossAccountReadOnly,
  matchSingleServiceWildcardResource,
  matchSpecificResource,
];
