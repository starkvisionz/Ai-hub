import { NextResponse, type NextRequest } from "next/server";

// Optional auth gate. Two independent, additive mechanisms — set whichever you
// need; both are no-ops when unset, so local dev stays frictionless:
//
//   HUB_BASIC_AUTH_USER / HUB_BASIC_AUTH_PASSWORD
//     HTTP Basic Auth for the browser UI (dashboard, /brain, and the API too).
//
//   HUB_API_TOKEN
//     A bearer token that authorizes /api/* requests. This is how programmatic
//     clients (agents, n8n workflows) keep writing to the brain when Basic Auth
//     is enabled — send `Authorization: Bearer <token>` or `X-Api-Token: <token>`.
//
// /api/health is always open (see the matcher) so healthchecks work.

// Length-checked, constant-time-ish string compare (avoids early content-based
// timing leaks). Edge runtime has no crypto.timingSafeEqual.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const user = process.env.HUB_BASIC_AUTH_USER;
  const pass = process.env.HUB_BASIC_AUTH_PASSWORD;
  const apiToken = process.env.HUB_API_TOKEN;
  const path = req.nextUrl.pathname;
  const basicEnabled = Boolean(user && pass);

  // Nothing configured → fully open (dev).
  if (!basicEnabled && !apiToken) return NextResponse.next();

  // API token authorizes /api/* for programmatic clients (bearer or header).
  if (apiToken && path.startsWith("/api/")) {
    const authz = req.headers.get("authorization");
    const headerToken = req.headers.get("x-api-token");
    if (
      (authz?.startsWith("Bearer ") && safeEqual(authz.slice(7), apiToken)) ||
      (headerToken && safeEqual(headerToken, apiToken))
    ) {
      return NextResponse.next();
    }
    // A token is configured but Basic Auth is not → token is the only gate here.
    if (!basicEnabled) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    // else fall through to Basic Auth (a browser session may still be valid).
  }

  // Basic Auth for pages (and for the API when no valid token was supplied).
  if (basicEnabled) {
    const header = req.headers.get("authorization");
    if (header?.startsWith("Basic ")) {
      try {
        const decoded = atob(header.slice(6));
        const idx = decoded.indexOf(":");
        const u = decoded.slice(0, idx);
        const p = decoded.slice(idx + 1);
        if (safeEqual(u, user!) && safeEqual(p, pass!)) {
          return NextResponse.next();
        }
      } catch {
        // fall through to 401
      }
    }
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="AI Hub", charset="UTF-8"' },
    });
  }

  // Only an API token is configured, and this is a non-API path → allow (the
  // token gates the API; pages are open unless Basic Auth is also set).
  return NextResponse.next();
}

export const config = {
  // Protect everything except the health probe and Next's static assets.
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
