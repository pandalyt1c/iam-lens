import { describe, expect, it } from "vitest";
import { examples } from "../examples";
import { parse } from "../parse";
import type { ParsedPolicy } from "../types";

describe("parse() — fixture roundtrips", () => {
  for (const example of examples) {
    it(`parses ${example.slug} to expected shape`, () => {
      const result = parse(example.policy);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.policy).toEqual(example.expected);
    });
  }
});

describe("parse() — synthetic positive fixtures (coverage gaps)", () => {
  it("accepts single-object Statement (not wrapped in array)", () => {
    const policy = `{
      "Version": "2012-10-17",
      "Statement": {
        "Effect": "Allow",
        "Action": "*",
        "Resource": "*"
      }
    }`;
    const expected: ParsedPolicy = {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: null,
          effect: "Allow",
          principals: [],
          notPrincipals: [],
          actions: ["*"],
          isNotAction: false,
          resources: ["*"],
          isNotResource: false,
          conditions: [],
        },
      ],
    };
    const result = parse(policy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.policy).toEqual(expected);
  });

  it("sets isNotResource: true when NotResource is used", () => {
    const policy = `{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Deny",
          "Action": "s3:DeleteObject",
          "NotResource": "arn:aws:s3:::protected-bucket/*"
        }
      ]
    }`;
    const expected: ParsedPolicy = {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: null,
          effect: "Deny",
          principals: [],
          notPrincipals: [],
          actions: ["s3:DeleteObject"],
          isNotAction: false,
          resources: ["arn:aws:s3:::protected-bucket/*"],
          isNotResource: true,
          conditions: [],
        },
      ],
    };
    const result = parse(policy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.policy).toEqual(expected);
  });
});
