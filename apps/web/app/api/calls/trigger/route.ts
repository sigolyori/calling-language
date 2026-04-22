import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";
import { triggerOutboundCall } from "@/lib/server/vapi";
import { prepareAssistantOverrides } from "@/lib/server/call-prep";

export async function POST(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const { scheduleId } = (await req.json().catch(() => ({}))) as { scheduleId?: string };
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const session = await prisma.session.create({
    data: { userId: uid, scheduleId: scheduleId ?? null, status: "scheduled" },
  });

  try {
    const overrides = await prepareAssistantOverrides(uid, session.id);
    const callId = await triggerOutboundCall(user.phoneNumber, session.id, overrides);
    await prisma.session.update({ where: { id: session.id }, data: { vapiCallId: callId, status: "in_progress" } });
    return NextResponse.json({ ok: true, sessionId: session.id, vapiCallId: callId, callingNumber: user.phoneNumber });
  } catch (err) {
    await prisma.session.update({ where: { id: session.id }, data: { status: "failed" } });
    return NextResponse.json({ error: "Failed to trigger call", detail: String(err) }, { status: 500 });
  }
}
