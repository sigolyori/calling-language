import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const { vapiCallId } = (await req.json().catch(() => ({}))) as { vapiCallId?: string };
  if (!vapiCallId) return NextResponse.json({ error: "vapiCallId required" }, { status: 400 });

  const { count } = await prisma.session.updateMany({
    where: { id: params.sessionId, userId: uid },
    data: { vapiCallId },
  });
  if (count === 0) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
