const PARAM = "p";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodePolicyToParam(policyText: string): string {
  const bytes = new TextEncoder().encode(policyText);
  return toBase64Url(bytes);
}

export function decodePolicyFromParam(param: string): string | null {
  try {
    return new TextDecoder().decode(fromBase64Url(param));
  } catch {
    return null;
  }
}

export function buildShareUrl(policyText: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, encodePolicyToParam(policyText));
  return url.toString();
}

export function readPolicyFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const param = new URL(window.location.href).searchParams.get(PARAM);
  if (!param) return null;
  return decodePolicyFromParam(param);
}

export const SHARE_PARAM = PARAM;
