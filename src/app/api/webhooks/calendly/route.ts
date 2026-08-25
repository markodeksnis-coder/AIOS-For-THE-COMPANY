import { NextRequest, NextResponse } from "next/server";
import { processCalendlyWebhook } from "@/lib/calendly-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = await processCalendlyWebhook(rawBody, request.headers.get("Calendly-Webhook-Signature"));
  return NextResponse.json(result.body, { status: result.status });
}
