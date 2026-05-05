interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface Env {
  SUBSCRIBERS: KVNamespace;
}

type PagesFunction<E = unknown> = (context: {
  request: Request;
  env: E;
}) => Response | Promise<Response>;

const ALLOWED_ORIGINS = new Set([
  "https://iamlens.dev",
  "https://www.iamlens.dev",
  "http://localhost:3000",
  "http://localhost:8788",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://iamlens.dev";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

export const onRequestOptions: PagesFunction<Env> = ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("Origin")) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");

  let payload: { email?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400, origin);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: "Invalid email" }, 400, origin);
  }

  try {
    const existing = await env.SUBSCRIBERS.get(email);
    if (!existing) {
      await env.SUBSCRIBERS.put(email, new Date().toISOString());
    }
    return json({ ok: true }, 200, origin);
  } catch {
    return json({ ok: false, error: "Storage error" }, 500, origin);
  }
};
