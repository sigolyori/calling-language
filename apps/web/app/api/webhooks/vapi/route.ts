import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { verifyVapiWebhook } from "@/lib/server/vapi";
import { generateFeedback } from "@/lib/server/feedback";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-vapi-signature") ?? undefined;
  if (!verifyVapiWebhook(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const type = payload?.message?.type;

  if (type === "call-started") {
    const vapiCallId = payload.message.call?.id;
    if (vapiCallId) {
      await prisma.session.updateMany({ where: { vapiCallId }, data: { status: "in_progress", startedAt: new Date() } });
    }
  } else if (type === "end-of-call-report" || type === "call-ended") {
    const vapiCallId = payload.message.call?.id;
    const metadata = payload.message.call?.metadata;
    const messages = payload.message.messages ?? [];
    const durationSecs = payload.message.durationSeconds ?? null;
    const endedReason = payload.message.endedReason ?? "unknown";

    const status = (endedReason === "assistant-ended-call" || endedReason === "customer-ended-call") ? "completed" : "failed";

    const transcriptContent = messages.map((m: { role: string; message: string; time: number }) => ({
      role: m.role, text: m.message, timestamp: m.time,
    }));
    const rawText = messages.map((m: { role: string; message: string }) =>
      `${m.role === "assistant" ? "AI" : "User"}: ${m.message}`
    ).join("\n");

    await prisma.session.updateMany({ where: { vapiCallId }, data: { status, endedAt: new Date(), durationSecs } });

    const sessionId = metadata?.sessionId;
    const session = sessionId
      ? await prisma.session.findUnique({ where: { id: sessionId } })
      : await prisma.session.findUnique({ where: { vapiCallId } });

    if (session && rawText.trim()) {
      await prisma.transcript.upsert({
        where: { sessionId: session.id },
        create: { sessionId: session.id, content: transcriptContent, rawText },
        update: { content: transcriptContent, rawText },
      });
      generateFeedback(session.id).catch(err => console.error(`Feedback failed:`, err));
    }
  }

  return NextResponse.json({ ok: true });
}
