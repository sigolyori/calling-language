import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import {
  registerScheduleJobs,
  removeScheduleJobs,
} from "../jobs/scheduler.js";

const createSchema = z.object({
  daysOfWeek: z
    .array(z.number().int().min(1).max(7))
    .min(1)
    .max(7),
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/),
});

const updateSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional(),
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

export async function scheduleRoutes(app: FastifyInstance) {
  app.get(
    "/api/schedules",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const schedules = await prisma.schedule.findMany({
        where: { userId: sub },
        orderBy: { createdAt: "asc" },
      });
      return reply.send(schedules);
    }
  );

  app.post(
    "/api/schedules",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const body = createSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() });
      }
      const { daysOfWeek, timeHHMM } = body.data;

      const schedule = await prisma.schedule.create({
        data: { userId: sub, daysOfWeek, timeHHMM },
      });

      await registerScheduleJobs(schedule.id, sub, daysOfWeek, timeHHMM);
      return reply.status(201).send(schedule);
    }
  );

  app.patch(
    "/api/schedules/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const { id } = request.params as { id: string };
      const body = updateSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() });
      }

      const existing = await prisma.schedule.findFirst({
        where: { id, userId: sub },
      });
      if (!existing) return reply.status(404).send({ error: "Not found" });

      // Remove old jobs
      await removeScheduleJobs(
        existing.id,
        existing.daysOfWeek,
        existing.timeHHMM
      );

      const updated = await prisma.schedule.update({
        where: { id },
        data: body.data,
      });

      // Re-register if still active
      if (updated.isActive) {
        await registerScheduleJobs(
          updated.id,
          sub,
          updated.daysOfWeek,
          updated.timeHHMM
        );
      }

      return reply.send(updated);
    }
  );

  app.delete(
    "/api/schedules/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub } = request.user as { sub: string };
      const { id } = request.params as { id: string };

      const existing = await prisma.schedule.findFirst({
        where: { id, userId: sub },
      });
      if (!existing) return reply.status(404).send({ error: "Not found" });

      await removeScheduleJobs(
        existing.id,
        existing.daysOfWeek,
        existing.timeHHMM
      );
      await prisma.schedule.delete({ where: { id } });
      return reply.status(204).send();
    }
  );
}
