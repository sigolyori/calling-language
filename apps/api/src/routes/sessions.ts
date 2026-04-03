import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function sessionRoutes(app: FastifyInstance) {
  // List sessions (paginated)
  app.get(
    "/api/sessions",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const q = paginationSchema.safeParse(request.query);
      if (!q.success) {
        return reply.status(400).send({ error: q.error.flatten() });
      }
      const { page, limit } = q.data;
      const skip = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where: { userId: sub },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            feedback: {
              select: {
                fluencyScore: true,
                vocabularyScore: true,
                grammarScore: true,
                overallSummary: true,
              },
            },
          },
        }),
        prisma.session.count({ where: { userId: sub } }),
      ]);

      return reply.send({ sessions, total, page, limit });
    }
  );

  // Get single session
  app.get(
    "/api/sessions/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const { id } = request.params as { id: string };

      const session = await prisma.session.findFirst({
        where: { id, userId: sub },
        include: {
          feedback: true,
          transcript: { select: { id: true, createdAt: true } },
        },
      });
      if (!session) return reply.status(404).send({ error: "Not found" });
      return reply.send(session);
    }
  );

  // Get transcript
  app.get(
    "/api/sessions/:id/transcript",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const { id } = request.params as { id: string };

      const session = await prisma.session.findFirst({
        where: { id, userId: sub },
        include: { transcript: true },
      });
      if (!session) return reply.status(404).send({ error: "Not found" });
      if (!session.transcript)
        return reply.status(404).send({ error: "Transcript not available" });
      return reply.send(session.transcript);
    }
  );

  // Get feedback
  app.get(
    "/api/sessions/:id/feedback",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const { id } = request.params as { id: string };

      const session = await prisma.session.findFirst({
        where: { id, userId: sub },
        include: { feedback: true },
      });
      if (!session) return reply.status(404).send({ error: "Not found" });
      if (!session.feedback)
        return reply.status(404).send({ error: "Feedback not available yet" });
      return reply.send(session.feedback);
    }
  );
}
