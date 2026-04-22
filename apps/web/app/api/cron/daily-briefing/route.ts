import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { generateAndStoreBriefing } from "@/lib/server/briefings";

export const maxDuration = 60;

async function handle(req: NextRequest) {
  const t0 = Date.now();
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateAndStoreBriefing();
    const ms = Date.now() - t0;
    if ("skipped" in result) {
      console.log(`[Briefing cron] Skipped: ${result.skipped} (${ms}ms)`);
      return NextResponse.json({ skipped: result.skipped }, { status: 503 });
    }
    console.log(`[Briefing cron] Success date=${result.date} items=${result.itemCount} (${ms}ms)`);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Briefing cron] Failed:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
