import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";
import { generateFeedback } from "@/lib/server/feedback";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const session = await prisma.session.findFirst({ where: { id: params.id, userId: uid }, include: { feedback: true } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.feedback) return NextResponse.json({ error: "Feedback not available yet" }, { status: 404 });
  return NextResponse.json(session.feedback);
}

// User-triggered retry. Safe to call repeatedly — generateFeedback no-ops if
// a feedback row already exists.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const session = await prisma.session.findFirst({
    where: { id: params.id, userId: uid },
    select: { id: true },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await generateFeedback(session.id);
    const fresh = await prisma.session.findUnique({
      where: { id: session.id },
      include: { feedback: true },
    });
    return NextResponse.json({
      ok: true,
      feedback: fresh?.feedback ?? null,
      feedbackError: fresh?.feedbackError ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Feedback retry] session=${session.id}:`, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
