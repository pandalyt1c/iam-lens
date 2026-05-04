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
  | "Public"            // Principal: "*" OR Principal: { "AWS": "*" } (the disaster case)
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

### Public principal — both forms treated identically

The classifier MUST treat both of these as `"Public"`:
- `"Principal": "*"` (shorthand)
- `"Principal": { "AWS": "*" }` (long-form, semantically identical)

Add explicit unit tests for both forms.

### Service principal display mapping

A small lookup table for the common service principals to render friendlier labels:
lambda.amazonaws.com         -> "AWS Lambda"
ec2.amazonaws.com            -> "Amazon EC2"
ecs-tasks.amazonaws.com      -> "Amazon ECS Tasks"
eks.amazonaws.com            -> "Amazon EKS"
glue.amazonaws.com           -> "AWS Glue"
states.amazonaws.com         -> "AWS Step Functions"
events.amazonaws.com         -> "Amazon EventBridge"
apigateway.amazonaws.com     -> "Amazon API Gateway"
sagemaker.amazonaws.com      -> "Amazon SageMaker"
codebuild.amazonaws.com      -> "AWS CodeBuild"
codepipeline.amazonaws.com   -> "AWS CodePipeline"
cloudformation.amazonaws.com -> "AWS CloudFormation"
// fallback: keep raw string

### Acceptance criteria

- Lambda execution role trust policy yields 1 Trustor of kind `"Service"`, display `"AWS Lambda"`
- Cross-account trust with ExternalId yields 1 Trustor of kind `"ExternalAccount"`, `accountId` set, `hasExternalId: true`
- Cross-account trust without ExternalId yields 1 Trustor of kind `"ExternalAccount"`, `hasExternalId: false`
- SAML federation trust yields 1 Trustor of kind `"Federated"`
- `Principal: "*"` yields 1 Trustor of kind `"Public"`
- `Principal: { "AWS": "*" }` ALSO yields 1 Trustor of kind `"Public"` (identical handling)

---

## Phase 3 — Trust Graph Visual Rendering + Context Banner

**Files touched:** new `components/TrustGraph.tsx`, new `components/PolicyTypeBanner.tsx`, modified `app/page.tsx`

### Visual distinction strategy (Open Question 1 — RESOLVED)

The Trust Graph and Policy Graph are deliberately distinct so users instantly know which view they're in:

| | Policy Graph (identity/resource) | Trust Graph (trust) |
|---|---|---|
| Layout direction | Left → right (statements → actions → resources) | Left → right BUT with explicit "Role" node in the middle |
| Primary node icon | `FileJson` for statements | `KeyRound` for trustors, `Shield` for the role |
| Edge labels | "→" minimal | Verbal: "is trusted by", "can assume", etc. |
| Color palette | Greens/oranges (allow/deny) | Blues/purples/oranges/reds (trustor classification) |
| Banner above graph | "This is an identity policy — it controls what an IAM user/role can do" | "This is a trust policy — it controls WHO can assume this role" |

The banner alone makes the policy type unmistakable on first glance.

### Context Banner component (Open Question 3 — RESOLVED)

Create `components/PolicyTypeBanner.tsx` — a small, dismissible info banner shown above the graph:

| `policyType` | Banner text |
|---|---|
| `"trust"` | "This is a trust policy — it controls WHO can assume this role." |
| `"identity"` | "This is an identity policy — it controls what an IAM user, group, or role can do." |
| `"resource"` | "This is a resource policy — it controls who can do what to a specific AWS resource (S3 bucket, KMS key, etc.)." |
| `"unknown"` | (no banner — silent fallback) |

Style: subtle, low-contrast background, small icon, one line of text, optional dismiss button (state can be ephemeral, no need to persist). Goal is gentle education for first-time users without nagging power users.

### Trust Graph layout
[Trustor Node]  ──trusts──▶  [This Role Node]  ──can──▶  [Action Nodes]
(one per                     (the role being         (sts:AssumeRole, etc.,
Trustor)                     defined)                from the trust statements)

### Node visual encoding

| Trustor kind | Color | Icon (lucide-react) | Notes |
|---|---|---|---|
| `Service` | 🟦 Blue | `Cog` or `Server` | Trusted: well-known AWS service |
| `ExternalAccount` (with ExternalId) | 🟢 Green | `Building2` | Properly hardened cross-account |
| `ExternalAccount` (no ExternalId) | 🟧 Orange | `Building2` + warning badge | Vulnerable pattern |
| `Federated` | 🟪 Purple | `KeyRound` | SAML/OIDC |
| `Public` | 🟥 Red | `AlertTriangle` | Critical risk node |
| `SameAccount` | ⬜ Gray | `Building2` | Trust within own account |

### Edge labels

- Service trust: `"is trusted by"`
- Cross-account: `"can assume from acct {accountId}"`
- Federated: `"can assume via {provider name}"`
- Public: `"can be assumed by ANYONE"` (red edge)

### Acceptance criteria

- Lambda trust policy renders as `[AWS Lambda] → [This Role] → [sts:AssumeRole]` with the trust banner above
- Cross-account trust renders with the external account ID visible on the trustor node
- The PolicyTypeBanner correctly identifies all 4 policy types (or stays silent for "unknown")
- Toggling between the new TrustGraph and the original PolicyGraph based on `policyType` works for all 17 example policies without breaking
- Pinch-zoom and drag still work on mobile (preserve React Flow controls)

---

## Phase 4 — Three New Risk Rules in `analyze.ts`

**Files touched:** `lib/parser/analyze.ts`, `lib/parser/__tests__/analyze.test.ts`

### Rule 4.1 — Cross-account trust without ExternalId or Org restriction

**Severity:** `high`
**Fires when:** policy is a trust policy AND a Trustor of kind `ExternalAccount` AND `hasExternalId === false` AND `hasOrgIdRestriction === false`
**Title:** `Cross-account trust without ExternalId`
**Detail:** `External AWS account {accountId} can assume this role with no ExternalId or PrincipalOrgID condition. This is the classic "confused deputy" vulnerability — any other customer of that vendor could trick them into assuming this role.`
**Fix:** `Add a Condition: { "StringEquals": { "sts:ExternalId": "your-unique-id" } } — or, if both accounts are in your org, use aws:PrincipalOrgID instead.`

### Rule 4.2 — Public trust principal (covers BOTH `"*"` and `{"AWS":"*"}` forms)

**Severity:** `critical`
**Fires when:** policy is a trust policy AND a Trustor of kind `Public` (regardless of which syntax form was used)
**Title:** `Public trust principal`
**Detail:** `Principal: "*" on a trust policy means anyone on the internet who knows the role ARN can assume it. This is almost certainly a test pattern that was never replaced with a real principal.`
**Fix:** `Replace Principal: "*" with the specific AWS account, service, or federated identity that should be allowed to assume this role.`

### Rule 4.3 — Human cross-account trust without MFA

**Severity:** `medium`
**Fires when:** policy is a trust policy AND a Trustor of kind `ExternalAccount` (with the principal being an IAM user, role, or root — i.e., a human or delegated human, not a service) AND no `aws:MultiFactorAuthPresent` condition
**Title:** `Cross-account human trust without MFA`
**Detail:** `External account {accountId} can assume this role without requiring MFA. For human-assumed cross-account roles, MFA is the recommended baseline per AWS, SOC 2, and PCI DSS.`
**Fix:** `Add a Condition: { "Bool": { "aws:MultiFactorAuthPresent": "true" } } to require MFA on assumption.`

### Heuristic note for Rule 4.3

Distinguishing "human" from "machine" cross-account access is imperfect. Heuristic:
- ExternalAccount with `:root` or `:user/` → likely human
- ExternalAccount with `:role/` containing words like `lambda`, `service`, `automation`, `ci`, `bot` → likely machine, suppress
- Otherwise default to "human" (false positives here are cheap; false negatives are not)

### Acceptance criteria

- Rule 4.1 fires on the existing "Cross-account WITHOUT ExternalId" example
- Rule 4.1 does NOT fire when ExternalId is present
- Rule 4.1 does NOT fire when `aws:PrincipalOrgID` is present
- Rule 4.2 fires on `Principal: "*"` trust policy
- Rule 4.2 ALSO fires on `Principal: { "AWS": "*" }` trust policy (long-form must be flagged identically)
- Rule 4.3 fires on cross-account trust pointing at `:root` with no MFA condition
- Rule 4.3 does NOT fire on service-principal trust (Lambda, EC2)
- All three rules tested in `analyze.test.ts` with positive and negative cases for each variant

---

## Phase 5 — New Examples for the Picker

**Files touched:** `lib/parser/examples.ts`

Add 6 new examples under a new "Trust policies" category:

1. **Lambda execution role** — service principal trust, safe baseline
2. **EC2 instance role** — service principal trust, safe baseline
3. **Cross-account vendor access (proper)** — ExternalAccount + ExternalId condition
4. **Cross-account vendor access (vulnerable)** — ExternalAccount, no ExternalId — demonstrates Rule 4.1
5. **SAML federated workforce trust** — Federated kind, common Okta/Azure AD pattern
6. **Public trust (DO NOT DEPLOY)** — Principal: "*", demonstrates Rule 4.2

Each example becomes a teaching moment in the demo flow.

---

## Phase 6 — Migration Safety / Backward Compat

**Files touched:** verify `lib/parser/normalize.ts` and `lib/parser/parse.ts` only

### Risks to avoid

- The current normalize.ts handles Principal in a generic way. Make sure the new `trustors[]` extraction is **additive** — the old `principals[]` field on each ParsedStatement should remain populated and unchanged so all existing tests pass.
- Adding fields to `ParsedPolicy` is safe (additive). Adding the `policyType` field doesn't break existing consumers as long as the field is optional or always present.
- Existing risk rules in `analyze.ts` should not change behavior for non-trust policies.

### Migration checklist

- [ ] All 58 existing tests pass with no modification
- [ ] No existing example produces different output (count, severity, ids of risk flags) when policy is identity or resource type
- [ ] Trust-classified policies that previously generated generic `priv-esc` flags should now generate the more specific Phase 4 flags AND suppress redundant generic ones (similar to the wildcard-action suppression logic from the recent admin double-flag fix)

---

## Sequencing and Time Estimate

| Phase | Description | Est. Time |
|---|---|---|
| 1 | Trust policy detection | 1–2 hr |
| 2 | Trustor extraction (incl. dual public-principal handling) | 1–2 hr |
| 3 | Trust Graph rendering + Context Banner component | 2–3 hr |
| 4 | Three new risk rules | 1–2 hr |
| 5 | Six new examples | 30 min – 1 hr |
| 6 | Backward compat verification | 30 min |
| **Total** | | **6–10 hours, 1 weekend** |

## Launch Plan for v1.1

- Develop on branch `v1.1-cross-account-trust`
- Merge to `main` only after all 58+new tests pass and all 17+6 examples render correctly on desktop and mobile
- Deploy via existing `npm run deploy` Cloudflare Pages flow
- Announce as "v1.1 update" in a Reddit + X post 7–10 days after Show HN, riding leftover launch attention

## Resolved Decisions (Open Questions Closed 2026-05-03)

1. **Visual distinction:** Trust Graph and Policy Graph are visually distinct (different layout, different node icons, different node colors). Banner above the graph reinforces the type.
2. **Public principal long-form:** `Principal: { "AWS": "*" }` is treated identically to `Principal: "*"` — both classified as `Public`, both fire Rule 4.2.
3. **Explanatory banner:** A small `PolicyTypeBanner` component sits above the graph and explains what kind of policy is being viewed (trust / identity / resource). Silent fallback for `unknown`.
