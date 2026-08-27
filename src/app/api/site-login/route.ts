import { NextRequest, NextResponse } from "next/server";
import { SITE_AUTH_COOKIE_NAME, hashSitePassword } from "@/lib/site-auth";

export async function POST(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "SITE_PASSWORD isn't configured on the server yet — add it in Vercel's env vars." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const submitted = (body as { password?: unknown })?.password;
  if (typeof submitted !== "string" || submitted !== password) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_AUTH_COOKIE_NAME, await hashSitePassword(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
  return response;
}
