import { NextRequest, NextResponse } from "next/server";
import { processFathomWebhook } from "@/lib/fathom-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = await processFathomWebhook(rawBody, {
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signature: request.headers.get("webhook-signature"),
  });
  return NextResponse.json(result.body, { status: result.status });
}
