import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { verifyVapiWebhook } from "../services/vapi.js";
import { generateFeedback } from "../services/feedback.js";

interface VapiTranscriptMessage {
  role: "assistant" | "user";
  message: string;
  time: number;
}

interface VapiCallStartedPayload {
  message: {
    type: "call-started";
    call: { id: string };
  };
}

interface VapiCallEndedPayload {
  message: {
    type: "end-of-call-report" | "call-ended";
    call: {
      id: string;
      startedAt?: string;
      endedAt?: string;
      metadata?: { sessionId?: string };
    };
    transcript?: string;
    messages?: VapiTranscriptMessage[];
    durationSeconds?: number;
    endedReason?: string;
  };
}

type VapiPayload = VapiCallStartedPayload | VapiCallEndedPayload;

export async function webhookRoutes(app: FastifyInstance) {
  app.post(
    "/api/webhooks/vapi",
    {
      config: { rawBody: true }, // requires @fastify/rawbody or addContentTypeParser
    },
    async (request, reply) => {
      const rawBody =
        (request as { rawBody?: string }).rawBody ?? JSON.stringify(request.body);
      const sig = request.headers["x-vapi-signature"] as string | undefined;

      if (!verifyVapiWebhook(rawBody, sig)) {
        return reply.status(401).send({ error: "Invalid webhook signature" });
      }

      const payload = request.body as VapiPayload;
      const { type } = payload.message;

      if (type === "call-started") {
        const p = payload as VapiCallStartedPayload;
        const vapiCallId = p.message.call.id;
        await prisma.session.updateMany({
          where: { vapiCallId },
          data: { status: "in_progress", startedAt: new Date() },
        });
        console.log(`[Webhook] call-started: ${vapiCallId}`);
      } else if (type === "end-of-call-report" || type === "call-ended") {
        const p = payload as VapiCallEndedPayload;
        const vapiCallId = p.message.call.id;
        const metadata = p.message.call.metadata;
        const sessionId = metadata?.sessionId;

        const endedAt = p.message.call.endedAt
          ? new Date(p.message.call.endedAt)
          : new Date();
        const durationSecs = p.message.durationSeconds ?? null;

        // Build transcript
        const messages = p.message.messages ?? [];
        const transcriptContent = messages.map((m) => ({
          role: m.role,
          text: m.message,
          timestamp: m.time,
        }));
        const rawText = messages
          .map((m) => `${m.role === "assistant" ? "AI" : "User"}: ${m.message}`)
          .join("\n");

        const endedReason = p.message.endedReason ?? "unknown";
        const status =
          endedReason === "assistant-ended-call" ||
          endedReason === "customer-ended-call"
            ? "completed"
            : "failed";

        // Update session
        const session = await prisma.session.updateMany({
          where: { vapiCallId },
          data: { status, endedAt, durationSecs },
        });

        // If we have session ID from metadata, use that; otherwise find by vapiCallId
        const resolvedSession = sessionId
          ? await prisma.session.findUnique({ where: { id: sessionId } })
          : await prisma.session.findUnique({ where: { vapiCallId } });

        if (resolvedSession && rawText.trim()) {
          await prisma.transcript.upsert({
            where: { sessionId: resolvedSession.id },
            create: {
              sessionId: resolvedSession.id,
              content: transcriptContent,
              rawText,
            },
            update: {
              content: transcriptContent,
              rawText,
            },
          });

          // Fire-and-forget feedback generation
          generateFeedback(resolvedSession.id).catch((err) =>
            console.error(`[Webhook] Feedback generation failed for session ${resolvedSession.id}:`, err)
          );
        }

        console.log(
          `[Webhook] ${type}: ${vapiCallId}, status=${status}, duration=${durationSecs}s`
        );
        void session; // suppress unused warning
      }

      return reply.send({ ok: true });
    }
  );
}
