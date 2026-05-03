import { describe, expect, it } from "vitest";
import { analyze } from "../analyze";
import { parse } from "../parse";
import type { ParsedPolicy } from "../types";

function parsePolicy(json: string): ParsedPolicy {
  const result = parse(json);
  if (!result.ok) throw new Error(`fixture failed to parse: ${result.error.code}`);
  return result.policy;
}

describe("analyze() — sensitive-action check skips wildcard-action statements", () => {
  it("pure admin policy produces exactly one flag with id starting with 'admin-'", () => {
    const policy = parsePolicy(`{
      "Version": "2012-10-17",
      "Statement": [
        { "Effect": "Allow", "Action": "*", "Resource": "*" }
      ]
    }`);
    const flags = analyze(policy);
    expect(flags).toHaveLength(1);
    expect(flags[0].id.startsWith("admin-")).toBe(true);
  });

  it("specific iam:PassRole without conditions still flags as sensitive-no-condition", () => {
    const policy = parsePolicy(`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": "iam:PassRole",
          "Resource": "arn:aws:iam::123456789012:role/some-role"
        }
      ]
    }`);
    const flags = analyze(policy);
    const sensitiveFlag = flags.find((f) =>
      f.id.startsWith("sensitive-no-condition-iam:passrole-"),
    );
    expect(sensitiveFlag).toBeDefined();
    expect(sensitiveFlag?.severity).toBe("high");
  });

  it("wildcard-action statement plus separate iam:PassRole statement produces both flag types", () => {
    const policy = parsePolicy(`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "Admin",
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        },
        {
          "Sid": "PassRole",
          "Effect": "Allow",
          "Action": "iam:PassRole",
          "Resource": "arn:aws:iam::123456789012:role/some-role"
        }
      ]
    }`);
    const flags = analyze(policy);

    const adminFlag = flags.find((f) => f.id.startsWith("admin-"));
    expect(adminFlag).toBeDefined();
    expect(adminFlag?.statementIndex).toBe(0);

    const passRoleFlag = flags.find((f) =>
      f.id.startsWith("sensitive-no-condition-iam:passrole-"),
    );
    expect(passRoleFlag).toBeDefined();
    expect(passRoleFlag?.statementIndex).toBe(1);

    const passRoleOnAdminStatement = flags.find(
      (f) => f.id === "sensitive-no-condition-iam:passrole-0",
    );
    expect(passRoleOnAdminStatement).toBeUndefined();
  });
});
