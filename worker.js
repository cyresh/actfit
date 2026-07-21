/**
 * Strava Dash — OAuth Relay Worker
 * Stage 0/1: handles the token exchange + refresh so the CLIENT_SECRET
 * never touches the browser. Deploy with `wrangler deploy`.
 *
 * Required secrets (set via `wrangler secret put`):
 *   STRAVA_CLIENT_ID
 *   STRAVA_CLIENT_SECRET
 *
 * Required var (wrangler.toml [vars] or dashboard):
 *   ALLOWED_ORIGIN  -> e.g. https://yourname.github.io
 */

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

function corsHeaders(origin, allowedOrigin) {
  const allow = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

async function handleExchange(request, env, headers) {
  const { code } = await request.json();
  if (!code) {
    return new Response(JSON.stringify({ error: "missing_code" }), { status: 400, headers });
  }

  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
  });

  const res = await fetch(`${STRAVA_TOKEN_URL}?${params.toString()}`, { method: "POST" });
  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "exchange_failed", detail: data }), {
      status: res.status,
      headers,
    });
  }

  // Only forward what the frontend needs — trims athlete blob down if desired.
  return new Response(
    JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete,
    }),
    { headers }
  );
}

async function handleRefresh(request, env, headers) {
  const { refresh_token } = await request.json();
  if (!refresh_token) {
    return new Response(JSON.stringify({ error: "missing_refresh_token" }), { status: 400, headers });
  }

  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(`${STRAVA_TOKEN_URL}?${params.toString()}`, { method: "POST" });
  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "refresh_failed", detail: data }), {
      status: res.status,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    }),
    { headers }
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
    }

    try {
      if (url.pathname === "/exchange") return await handleExchange(request, env, headers);
      if (url.pathname === "/refresh") return await handleRefresh(request, env, headers);
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: "server_error", detail: String(err) }), {
        status: 500,
        headers,
      });
    }
  },
};
