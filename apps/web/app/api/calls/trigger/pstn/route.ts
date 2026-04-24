import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";
import { triggerOutboundCall } from "@/lib/server/vapi";
import { createCallSession } from "@/lib/server/session-create";

export async function POST(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const { scheduleId } = (await req.json().catch(() => ({}))) as { scheduleId?: string };
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { sessionId, overrides } = await createCallSession({
    userId: uid,
    callType: "pstn",
    scheduleId: scheduleId ?? null,
  });

  try {
    const callId = await triggerOutboundCall(user.phoneNumber, sessionId, overrides);
    await prisma.session.update({
      where: { id: sessionId },
      data: { vapiCallId: callId, status: "in_progress" },
    });
    return NextResponse.json({
      ok: true,
      sessionId,
      vapiCallId: callId,
      callingNumber: user.phoneNumber,
    });
  } catch (err) {
    await prisma.session.update({ where: { id: sessionId }, data: { status: "failed" } });
    return NextResponse.json({ error: "Failed to trigger call", detail: String(err) }, { status: 500 });
  }
}
