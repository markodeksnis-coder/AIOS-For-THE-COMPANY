// Shared by middleware.ts (Edge runtime) and the site-login route (Node
// runtime) — only Web-standard APIs (Web Crypto, TextEncoder) so it works
// in both. The cookie stores a hash of SITE_PASSWORD, not the password
// itself, so a leaked cookie value doesn't hand over the real password.

export const SITE_AUTH_COOKIE_NAME = "site_auth";

export async function hashSitePassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
