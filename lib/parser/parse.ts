import type {
  Effect,
  ParseError,
  ParseResult,
  ParsedPolicy,
  ParsedStatement,
} from "./types";
import {
  InternalParseError,
  isPlainObject,
  normalizeConditions,
  normalizePrincipal,
  normalizeStatementArray,
  normalizeStringOrArray,
} from "./normalize";

export function parse(input: string): ParseResult {
  if (input.trim() === "") {
    return {
      ok: false,
      error: { code: "EMPTY_INPUT", message: "Policy input is empty." },
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: e instanceof Error ? e.message : "Invalid JSON.",
      },
    };
  }

  if (!isPlainObject(raw)) {
    return {
      ok: false,
      error: {
        code: "NOT_AN_OBJECT",
        message: "Policy must be a JSON object.",
      },
    };
  }

  try {
    return { ok: true, policy: buildPolicy(raw) };
  } catch (e) {
    return { ok: false, error: toParseError(e) };
  }
}

function toParseError(e: unknown): ParseError {
  if (e instanceof InternalParseError) {
    const error: ParseError = { code: e.code, message: e.message };
    if (e.statementIndex !== undefined) error.statementIndex = e.statementIndex;
    if (e.path !== undefined) error.path = e.path;
    return error;
  }
  return {
    code: "INVALID_FIELD_TYPE",
    message: e instanceof Error ? e.message : "Unknown parser error.",
  };
}

function buildPolicy(raw: Record<string, unknown>): ParsedPolicy {
  const version = typeof raw.Version === "string" ? raw.Version : null;
  const id = typeof raw.Id === "string" ? raw.Id : null;

  if (raw.Statement === undefined) {
    throw new InternalParseError(
      "MISSING_STATEMENT",
      "Policy is missing required Statement field.",
    );
  }

  const rawStatements = normalizeStatementArray(raw.Statement);
  const statements = rawStatements.map((stmt, i) => buildStatement(stmt, i));
  return { version, id, statements };
}

function buildStatement(
  raw: Record<string, unknown>,
  index: number,
): ParsedStatement {
  if (raw.Effect === undefined) {
    throw new InternalParseError(
      "MISSING_EFFECT",
      `Statement[${index}] is missing Effect.`,
      index,
    );
  }
  if (raw.Effect !== "Allow" && raw.Effect !== "Deny") {
    throw new InternalParseError(
      "INVALID_EFFECT",
      `Statement[${index}] Effect must be exactly "Allow" or "Deny".`,
      index,
    );
  }
  const effect: Effect = raw.Effect;

  const hasAction = raw.Action !== undefined;
  const hasNotAction = raw.NotAction !== undefined;
  if (hasAction && hasNotAction) {
    throw new InternalParseError(
      "ACTION_AND_NOTACTION",
      `Statement[${index}] cannot have both Action and NotAction.`,
      index,
    );
  }
  if (!hasAction && !hasNotAction) {
    throw new InternalParseError(
      "MISSING_ACTION",
      `Statement[${index}] must have Action or NotAction.`,
      index,
    );
  }
  const actionField = hasAction ? "Action" : "NotAction";
  const actions = normalizeStringOrArray(
    hasAction ? raw.Action : raw.NotAction,
    actionField,
  );

  const hasResource = raw.Resource !== undefined;
  const hasNotResource = raw.NotResource !== undefined;
  if (hasResource && hasNotResource) {
    throw new InternalParseError(
      "RESOURCE_AND_NOTRESOURCE",
      `Statement[${index}] cannot have both Resource and NotResource.`,
      index,
    );
  }
  let resources: string[] = [];
  let isNotResource = false;
  if (hasResource) {
    resources = normalizeStringOrArray(raw.Resource, "Resource");
  } else if (hasNotResource) {
    resources = normalizeStringOrArray(raw.NotResource, "NotResource");
    isNotResource = true;
  }

  const hasPrincipal = raw.Principal !== undefined;
  const hasNotPrincipal = raw.NotPrincipal !== undefined;
  if (hasPrincipal && hasNotPrincipal) {
    throw new InternalParseError(
      "PRINCIPAL_AND_NOTPRINCIPAL",
      `Statement[${index}] cannot have both Principal and NotPrincipal.`,
      index,
    );
  }
  const principals = hasPrincipal ? normalizePrincipal(raw.Principal) : [];
  const notPrincipals = hasNotPrincipal
    ? normalizePrincipal(raw.NotPrincipal)
    : [];

  const conditions =
    raw.Condition !== undefined ? normalizeConditions(raw.Condition) : [];

  const sid = typeof raw.Sid === "string" ? raw.Sid : null;

  return {
    sid,
    effect,
    principals,
    notPrincipals,
    actions,
    isNotAction: hasNotAction,
    resources,
    isNotResource,
    conditions,
  };
}
