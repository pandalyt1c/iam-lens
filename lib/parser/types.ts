export type Effect = "Allow" | "Deny";

export type PrincipalKind =
  | "AWS"
  | "Service"
  | "Federated"
  | "CanonicalUser"
  | "Wildcard";

export interface ParsedPrincipal {
  kind: PrincipalKind;
  value: string;
}

export interface ParsedCondition {
  operator: string;
  key: string;
  values: string[];
}

export interface ParsedStatement {
  sid: string | null;
  effect: Effect;
  principals: ParsedPrincipal[];
  notPrincipals: ParsedPrincipal[];
  actions: string[];
  isNotAction: boolean;
  resources: string[];
  isNotResource: boolean;
  conditions: ParsedCondition[];
}

export interface ParsedPolicy {
  version: string | null;
  id: string | null;
  statements: ParsedStatement[];
}

export type ParseErrorCode =
  | "EMPTY_INPUT"
  | "INVALID_JSON"
  | "NOT_AN_OBJECT"
  | "MISSING_STATEMENT"
  | "STATEMENT_NOT_OBJECT"
  | "MISSING_EFFECT"
  | "INVALID_EFFECT"
  | "MISSING_ACTION"
  | "ACTION_AND_NOTACTION"
  | "RESOURCE_AND_NOTRESOURCE"
  | "PRINCIPAL_AND_NOTPRINCIPAL"
  | "INVALID_PRINCIPAL"
  | "INVALID_CONDITION"
  | "INVALID_FIELD_TYPE";

export interface ParseError {
  code: ParseErrorCode;
  message: string;
  statementIndex?: number;
  path?: string;
}

export type ParseResult =
  | { ok: true; policy: ParsedPolicy }
  | { ok: false; error: ParseError };

export type RawPolicy = {
  Version?: unknown;
  Id?: unknown;
  Statement?: unknown;
};

export type RawStatement = {
  Sid?: unknown;
  Effect?: unknown;
  Principal?: unknown;
  NotPrincipal?: unknown;
  Action?: unknown;
  NotAction?: unknown;
  Resource?: unknown;
  NotResource?: unknown;
  Condition?: unknown;
};
