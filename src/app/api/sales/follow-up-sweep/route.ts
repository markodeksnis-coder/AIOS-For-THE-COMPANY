import { NextResponse } from "next/server";
import { runFollowUpSweep } from "@/lib/follow-up-sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const outcome = await runFollowUpSweep();

  if (!outcome.ran) {
    if (outcome.reason.startsWith("Nothing to sweep")) {
      return NextResponse.json({ ranAt: new Date().toISOString(), swept: 0, totalDraftsCreated: 0, results: [], message: outcome.reason });
    }
    return NextResponse.json({ error: outcome.reason }, { status: 503 });
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    swept: outcome.swept,
    totalDraftsCreated: outcome.totalDraftsCreated,
    failed: outcome.failed,
    results: outcome.results,
  });
}
