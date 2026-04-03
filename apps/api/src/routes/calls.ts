import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { triggerOutboundCall } from "../services/vapi.js";

export async function callRoutes(app: FastifyInstance) {
  // Manual call trigger — for testing without waiting for cron
  app.post(
    "/api/calls/trigger",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const { scheduleId } = (request.body ?? {}) as { scheduleId?: string };

      const user = await prisma.user.findUnique({ where: { id: sub } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const session = await prisma.session.create({
        data: { userId: sub, scheduleId: scheduleId ?? null, status: "scheduled" },
      });

      try {
        const callId = await triggerOutboundCall(user.phoneNumber, session.id);
        await prisma.session.update({
          where: { id: session.id },
          data: { vapiCallId: callId, status: "in_progress" },
        });
        return reply.send({
          ok: true,
          sessionId: session.id,
          vapiCallId: callId,
          callingNumber: user.phoneNumber,
        });
      } catch (err) {
        await prisma.session.update({
          where: { id: session.id },
          data: { status: "failed" },
        });
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ error: "Failed to trigger call", detail: msg });
      }
    }
  );
}
