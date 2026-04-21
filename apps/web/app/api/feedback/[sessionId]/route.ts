import { NextRequest, NextResponse } from "next/server";
import { generateFeedback } from "@/lib/server/feedback";

// Internal endpoint called by the Vapi webhook after a call ends.
// Runs feedback generation in its own serverless invocation to avoid
// the webhook function's timeout constraint.
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    await generateFeedback(sessionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[Feedback] Failed for session ${sessionId}:`, err);
    return NextResponse.json({ error: "Feedback generation failed" }, { status: 500 });
  }
}
