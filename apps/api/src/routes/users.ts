import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phoneNumber: z.string().min(7).optional(),
  englishLevel: z.enum(["beginner", "intermediate"]).optional(),
  timezone: z.string().min(1).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/api/users/me",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const user = await prisma.user.findUnique({
        where: { id: sub },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          englishLevel: true,
          timezone: true,
          createdAt: true,
        },
      });
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send(user);
    }
  );

  app.patch(
    "/api/users/me",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const body = updateSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() });
      }

      const user = await prisma.user.update({
        where: { id: sub },
        data: body.data,
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          englishLevel: true,
          timezone: true,
          createdAt: true,
        },
      });
      return reply.send(user);
    }
  );
}
