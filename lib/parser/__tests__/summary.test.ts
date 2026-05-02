import { describe, expect, it } from "vitest";
import { examples } from "../examples";
import { summarize } from "../summary";

const expectations: Record<string, string[]> = {
  "s3-read-only-bucket": ["S3", "example-reports", "read"],
  "ec2-describe-only": ["EC2", "read-only"],
  "lambda-invoke-specific": ["Lambda", "process-orders"],
  "lambda-execution-role-trust": ["Trust policy", "Lambda"],
  "cross-account-s3-read": ["222233334444", "shared-data"],
  "deny-without-mfa": ["MFA", "guardrail"],
  "admin-full-access": ["administrator", "review"],
  "iam-passrole-wildcard": ["IAM role", "EC2", "escalation"],
};

describe("summarize() — fixture summaries mention key terms", () => {
  for (const example of examples) {
    it(`${example.slug}`, () => {
      const terms = expectations[example.slug];
      if (!terms) {
        throw new Error(`No expectations defined for ${example.slug}`);
      }
      const summary = summarize(example.expected);
      expect(summary.length).toBeGreaterThan(0);
      for (const term of terms) {
        expect(summary).toContain(term);
      }
    });
  }
});
