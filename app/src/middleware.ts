import { NextResponse, type NextRequest } from "next/server";

// Optional HTTP Basic Auth gate. Even behind Tailscale, this stops the dashboard
// (and its internal service links) from being open to anyone who reaches the
// host. Enabled only when BOTH env vars are set; otherwise it's a no-op so local
// dev stays frictionless.
//
//   HUB_BASIC_AUTH_USER=...
//   HUB_BASIC_AUTH_PASSWORD=...
//
// /api/health is intentionally left open so Docker/Coolify healthchecks work.

export function middleware(req: NextRequest) {
  const user = process.env.HUB_BASIC_AUTH_USER;
  const pass = process.env.HUB_BASIC_AUTH_PASSWORD;
  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      const u = decoded.slice(0, idx);
      const p = decoded.slice(idx + 1);
      if (u === user && p === pass) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AI Hub", charset="UTF-8"' },
  });
}

export const config = {
  // Protect everything except the health probe and Next's static assets.
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
