import { NextRequest, NextResponse } from "next/server";
import { SITE_AUTH_COOKIE_NAME, hashSitePassword } from "@/lib/site-auth";

// Company OS has no per-user login system — everything here is one shared
// site, gated by one shared password. This exists specifically because
// three routes (agent chat, lead draft generation, the follow-up sweep)
// call the Claude API and write to the database with zero auth of their
// own; rather than patch just those three, every route gets the same gate
// so the rest of the app (real leads, deal values, revenue numbers) isn't
// sitting open either. Webhook routes and the cron route are excluded
// below — they're called by Calendly/Fathom/Vercel's scheduler, not a
// browser, and already have their own signature/secret checks.
export async function middleware(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  // No SITE_PASSWORD configured yet — fail open rather than lock everyone
  // out of a deploy that hasn't had the env var set up.
  if (!password) return NextResponse.next();

  const expected = await hashSitePassword(password);
  const cookie = request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value;
  if (cookie === expected) return NextResponse.next();

  const loginUrl = new URL("/site-login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks/calendly|api/webhooks/fathom|api/cron/daily|site-login|api/site-login).*)",
  ],
};
