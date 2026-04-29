// NOTE: parse() validates fields in this order: Effect → Action/NotAction → Resource/NotResource
// → Principal/NotPrincipal → Condition. Each malformed test below isolates one error by keeping
// earlier-checked fields valid. If parser check order changes, these tests may need adjustment.

import { describe, expect, it } from "vitest";
import { parse } from "../parse";
import type { ParseErrorCode } from "../types";

function expectError(input: string, code: ParseErrorCode): void {
  const result = parse(input);
  if (result.ok) {
    throw new Error(`Expected error ${code}, but parse succeeded`);
  }
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe("parse() — malformed input", () => {
  it("a. empty string → EMPTY_INPUT", () => {
    expectError("", "EMPTY_INPUT");
  });

  it("b. whitespace only → EMPTY_INPUT", () => {
    expectError("   ", "EMPTY_INPUT");
  });

  it("c. malformed JSON → INVALID_JSON", () => {
    expectError("{{{", "INVALID_JSON");
  });

  it("d. top-level array → NOT_AN_OBJECT", () => {
    expectError("[1,2,3]", "NOT_AN_OBJECT");
  });

  it("e. top-level string → NOT_AN_OBJECT", () => {
    expectError('"hello"', "NOT_AN_OBJECT");
  });

  it("f. missing Statement → MISSING_STATEMENT", () => {
    expectError(`{"Version": "2012-10-17"}`, "MISSING_STATEMENT");
  });

  it("g. Statement is a number → STATEMENT_NOT_OBJECT", () => {
    expectError(`{"Statement": 42}`, "STATEMENT_NOT_OBJECT");
  });

  it("h. missing Effect → MISSING_EFFECT", () => {
    expectError(
      `{"Statement": [{"Action": "*", "Resource": "*"}]}`,
      "MISSING_EFFECT",
    );
  });

  it('i. Effect "allow" lowercase → INVALID_EFFECT', () => {
    expectError(
      `{"Statement": [{"Effect": "allow", "Action": "*", "Resource": "*"}]}`,
      "INVALID_EFFECT",
    );
  });

  it('j. Effect "Permit" → INVALID_EFFECT', () => {
    expectError(
      `{"Statement": [{"Effect": "Permit", "Action": "*", "Resource": "*"}]}`,
      "INVALID_EFFECT",
    );
  });

  it("k. both Action and NotAction → ACTION_AND_NOTACTION", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Action": "*", "NotAction": "iam:*", "Resource": "*"}]}`,
      "ACTION_AND_NOTACTION",
    );
  });

  it("l. neither Action nor NotAction → MISSING_ACTION", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Resource": "*"}]}`,
      "MISSING_ACTION",
    );
  });

  it("m. both Resource and NotResource → RESOURCE_AND_NOTRESOURCE", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Action": "*", "Resource": "*", "NotResource": "arn:aws:s3:::x"}]}`,
      "RESOURCE_AND_NOTRESOURCE",
    );
  });

  it("n. both Principal and NotPrincipal → PRINCIPAL_AND_NOTPRINCIPAL", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Principal": "*", "NotPrincipal": {"AWS": "arn:aws:iam::123456789012:root"}, "Action": "*", "Resource": "*"}]}`,
      "PRINCIPAL_AND_NOTPRINCIPAL",
    );
  });

  it("o. Principal as a number → INVALID_PRINCIPAL", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Principal": 42, "Action": "*", "Resource": "*"}]}`,
      "INVALID_PRINCIPAL",
    );
  });

  it("p. Principal with unknown kind → INVALID_PRINCIPAL", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Principal": {"Robot": "*"}, "Action": "*", "Resource": "*"}]}`,
      "INVALID_PRINCIPAL",
    );
  });

  it("q. Condition not an object → INVALID_CONDITION", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Action": "*", "Resource": "*", "Condition": "nope"}]}`,
      "INVALID_CONDITION",
    );
  });

  it("r. Action as a number → INVALID_FIELD_TYPE", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Action": 42, "Resource": "*"}]}`,
      "INVALID_FIELD_TYPE",
    );
  });

  it("s. Action array containing non-string → INVALID_FIELD_TYPE", () => {
    expectError(
      `{"Statement": [{"Effect": "Allow", "Action": ["s3:GetObject", 42], "Resource": "*"}]}`,
      "INVALID_FIELD_TYPE",
    );
  });
});
