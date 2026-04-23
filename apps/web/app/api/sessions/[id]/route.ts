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

  const feedbackUnavailableReason =
    session.status === "completed" && !session.feedback && !env.ANTHROPIC_API_KEY
      ? "no_api_key"
      : null;

  return NextResponse.json({ ...session, feedbackUnavailableReason });
}
