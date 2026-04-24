import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";
import { env } from "@/lib/server/env";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const session = await prisma.session.findFirst({
    where: { id: params.id, userId: uid },
    include: { feedback: true, transcript: { select: { id: true, createdAt: true } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let feedbackStatus:
    | "success"
    | "pending"
    | "failed"
    | "too_short"
    | "no_api_key"
    | null = null;

  if (session.feedback) {
    feedbackStatus = "success";
  } else if (session.status === "completed") {
    if (!env.ANTHROPIC_API_KEY) feedbackStatus = "no_api_key";
    else if (session.feedbackError === "transcript_too_short") feedbackStatus = "too_short";
    else if (session.feedbackError) feedbackStatus = "failed";
    else feedbackStatus = "pending";
  }

  return NextResponse.json({ ...session, feedbackStatus });
}
