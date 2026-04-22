import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { verifyVapiWebhook } from "@/lib/server/vapi";
import { generateFeedback } from "@/lib/server/feedback";
import { extractAndUpsertProfile } from "@/lib/server/profiles";

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
      await prisma.session.updateMany({
        where: { vapiCallId },
        data: { status: "in_progress", startedAt: new Date() },
      });
    }
  } else if (type === "end-of-call-report" || type === "call-ended") {
    const vapiCallId = payload.message.call?.id;
    const metadata = payload.message.call?.metadata;
    const messages = payload.message.messages ?? [];
    const durationSecs = payload.message.durationSeconds ?? null;
    const endedReason = payload.message.endedReason ?? "unknown";

    const status =
      endedReason === "assistant-ended-call" || endedReason === "customer-ended-call"
        ? "completed"
        : "failed";

    // Vapi uses "bot" for AI and "user" for the caller.
    // Filter out system/tool messages and normalise "bot" → "assistant".
    type VapiMessage = { role: string; message?: string; text?: string; time?: number };
    const convo = (messages as VapiMessage[]).filter(
      (m) => m.role === "bot" || m.role === "user"
    );

    const transcriptContent = convo.map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      text: (m.message ?? m.text ?? "").trim(),
      timestamp: m.time ?? 0,
    }));
    const rawText = transcriptContent
      .map((m) => `${m.role === "assistant" ? "AI" : "User"}: ${m.text}`)
      .join("\n");

    await prisma.session.updateMany({
      where: { vapiCallId },
      data: { status, endedAt: new Date(), durationSecs },
    });

    const sessionId = metadata?.sessionId;
    const session = sessionId
      ? await prisma.session.findUnique({ where: { id: sessionId } })
      : await prisma.session.findFirst({ where: { vapiCallId } });

    if (session && rawText.trim()) {
      await prisma.transcript.upsert({
        where: { sessionId: session.id },
        create: { sessionId: session.id, content: transcriptContent, rawText },
        update: { content: transcriptContent, rawText },
      });

      // Feedback (Sonnet) and profile extraction (Haiku) run in parallel — both
      // read the same transcript and neither depends on the other. Vapi's webhook
      // timeout (~30s) is generous; each Claude call typically returns in <5s.
      // Failures are isolated per-task so one doesn't take down the other.
      await Promise.all([
        generateFeedback(session.id).catch((err) =>
          console.error("[Webhook] Feedback generation failed:", err),
        ),
        extractAndUpsertProfile(session.id).catch((err) =>
          console.error("[Webhook] Profile extraction failed:", err),
        ),
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
