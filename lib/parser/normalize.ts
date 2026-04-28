import type {
  ParseErrorCode,
  ParsedCondition,
  ParsedPrincipal,
  PrincipalKind,
} from "./types";

export class InternalParseError extends Error {
  constructor(
    public readonly code: ParseErrorCode,
    message: string,
    public readonly statementIndex?: number,
    public readonly path?: string,
  ) {
    super(message);
    this.name = "InternalParseError";
  }
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeStatementArray(
  input: unknown,
): Record<string, unknown>[] {
  const arr: unknown[] = Array.isArray(input) ? input : [input];
  const result: Record<string, unknown>[] = [];
  for (const item of arr) {
    if (!isPlainObject(item)) {
      throw new InternalParseError(
        "STATEMENT_NOT_OBJECT",
        "Statement entries must be objects.",
      );
    }
    result.push(item);
  }
  return result;
}

export function normalizeStringOrArray(
  input: unknown,
  field: string,
): string[] {
  if (typeof input === "string") return [input];
  if (Array.isArray(input)) {
    const result: string[] = [];
    for (const v of input) {
      if (typeof v !== "string") {
        throw new InternalParseError(
          "INVALID_FIELD_TYPE",
          `${field} array must contain only strings.`,
          undefined,
          field,
        );
      }
      result.push(v);
    }
    return result;
  }
  throw new InternalParseError(
    "INVALID_FIELD_TYPE",
    `${field} must be a string or array of strings.`,
    undefined,
    field,
  );
}

const PRINCIPAL_KINDS: Record<string, PrincipalKind> = {
  AWS: "AWS",
  Service: "Service",
  Federated: "Federated",
  CanonicalUser: "CanonicalUser",
};

export function normalizePrincipal(input: unknown): ParsedPrincipal[] {
  if (input === "*") return [{ kind: "Wildcard", value: "*" }];
  if (!isPlainObject(input)) {
    throw new InternalParseError(
      "INVALID_PRINCIPAL",
      'Principal must be "*" or an object keyed by AWS/Service/Federated/CanonicalUser.',
    );
  }
  const result: ParsedPrincipal[] = [];
  for (const [rawKind, rawValue] of Object.entries(input)) {
    const kind = PRINCIPAL_KINDS[rawKind];
    if (!kind) {
      throw new InternalParseError(
        "INVALID_PRINCIPAL",
        `Unknown principal kind "${rawKind}".`,
      );
    }
    const values = normalizeStringOrArray(rawValue, `Principal.${rawKind}`);
    for (const value of values) {
      result.push({ kind, value });
    }
  }
  return result;
}

export function normalizeConditions(input: unknown): ParsedCondition[] {
  if (!isPlainObject(input)) {
    throw new InternalParseError(
      "INVALID_CONDITION",
      "Condition must be an object.",
    );
  }
  const result: ParsedCondition[] = [];
  for (const [operator, opValue] of Object.entries(input)) {
    if (!isPlainObject(opValue)) {
      throw new InternalParseError(
        "INVALID_CONDITION",
        `Condition operator "${operator}" must map to an object.`,
      );
    }
    for (const [key, rawValue] of Object.entries(opValue)) {
      const path = `Condition.${operator}.${key}`;
      let values: string[];
      if (typeof rawValue === "string") {
        values = [rawValue];
      } else if (Array.isArray(rawValue)) {
        values = [];
        for (const v of rawValue) {
          if (typeof v !== "string") {
            throw new InternalParseError(
              "INVALID_CONDITION",
              `${path} array must contain only strings.`,
            );
          }
          values.push(v);
        }
      } else {
        throw new InternalParseError(
          "INVALID_CONDITION",
          `${path} must be a string or array of strings.`,
        );
      }
      result.push({ operator, key, values });
    }
  }
  return result;
}
