# IAM Lens v1.1 — Cross-Account Trust Visualization + Trust-Specific Risk Rules

> Plan written 2026-05-03. Scope informed by 2026 IAM pain-point research (FireMon Dec 2025 ExternalId vulnerability data, Binadox 1-week-old confused-deputy guidance, OneUptime Feb 2026 multi-account patterns, AWS troubleshooting blogs Feb 2026, Trend Micro audit checklist).
> Implementation target: Weekend 4 (after May 27 launch).

## Goals

1. Make IAM Lens correctly identify and visually distinguish trust policies from identity/resource policies.
2. Surface the cross-account / federated / service / public structure of trust as the primary visual, not as a generic Statement → Action → Resource graph.
3. Add three risk rules that target failure modes engineers are actively making in 2026.
4. Build on the existing parser without breaking any of the 58 currently-passing tests.

## Non-Goals (explicitly out of scope)

- Cross-account simulation across multiple AWS accounts
- Resolving role ARNs to actual permissions across attached managed/inline policies
- Permission boundary intersection / SCP evaluation
- Any AWS API access or credentials
- Effective permissions across multiple policy documents (deferred to v1.2)

---

## Phase 1 — Trust Policy Detection in Parser

**Files touched:** `lib/parser/types.ts`, `lib/parser/parse.ts`, `lib/parser/__tests__/parse.test.ts`

### Detection logic

A parsed policy is classified as one of:

- `"trust"` — Every statement has a `Principal` field AND at least one statement uses `sts:AssumeRole`, `sts:AssumeRoleWithSAML`, `sts:AssumeRoleWithWebIdentity`, or `sts:GetFederationToken`. Trust policies are attached to roles, not identities.
- `"resource"` — At least one statement has a `Principal` field, but actions are NOT primarily `sts:Assume*`. Examples: S3 bucket policies, KMS key policies, SQS queue policies.
- `"identity"` — No `Principal` field on any statement. The default for managed and inline policies attached to users/groups/roles.
- `"unknown"` — Mixed or ambiguous (rare).

### New type fields

```ts
// Add to ParsedPolicy
export interface ParsedPolicy {
  // ... existing fields
  policyType: "identity" | "resource" | "trust" | "unknown";
}
```

### Acceptance criteria

- All 17 existing examples continue to classify correctly:
  - All "least privilege" examples → `"identity"`
  - "Lambda execution role trust policy" → `"trust"`
  - "Cross-account AssumeRole with ExternalID" → `"trust"`
- Existing 58 tests still pass with no modification
- New tests in parse.test.ts cover each of the four classifications

---

## Phase 2 — Trustor Extraction and Classification

**Files touched:** `lib/parser/types.ts`, `lib/parser/normalize.ts` (or new `lib/parser/trustors.ts`), tests

### New types

```ts
export type TrustorKind =
  | "Service"           // lambda.amazonaws.com, ec2.amazonaws.com, etc.
  | "ExternalAccount"   // arn:aws:iam::OTHER_ACCOUNT:root or :role/X
  | "SameAccount"       // arn:aws:iam::SELF:root (rarely useful but legal)
  | "Federated"         // arn:aws:iam::ACCT:saml-provider/X or oidc-provider/X
  | "Public"            // Principal: "*" (the disaster case)
  | "CanonicalUser";    // S3 legacy

export interface Trustor {
  kind: TrustorKind;
  value: string;              // The raw principal string
  display: string;            // Human-readable label (e.g., "AWS Lambda" instead of "lambda.amazonaws.com")
  accountId?: string;         // Extracted from ARN when applicable
  conditions: ParsedCondition[];  // Conditions that gate this trustor
  hasExternalId: boolean;     // True if any condition uses sts:ExternalId
  hasMfa: boolean;            // True if any condition uses aws:MultiFactorAuthPresent
  hasOrgIdRestriction: boolean; // True if condition uses aws:PrincipalOrgID
}

// Add to ParsedPolicy
export interface ParsedPolicy {
  // ... existing fields
  trustors: Trustor[];  // Empty array if not a trust policy
}
```

### Service principal display mapping

A small lookup table for the common service principals to render friendlier labels:
