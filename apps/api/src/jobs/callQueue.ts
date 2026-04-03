import { Queue, Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { triggerOutboundCall } from "../services/vapi.js";

export const CALL_QUEUE = "call-queue";

export const callQueue = new Queue(CALL_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export function startCallWorker() {
  const worker = new Worker(
    CALL_QUEUE,
    async (job) => {
      const { userId, scheduleId } = job.data as {
        userId: string;
        scheduleId: string;
      };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        console.error(`[CallWorker] User not found: ${userId}`);
        return;
      }

      // Create a session record
      const session = await prisma.session.create({
        data: { userId, scheduleId, status: "scheduled" },
      });

      try {
        const callId = await triggerOutboundCall(
          user.phoneNumber,
          session.id
        );
        await prisma.session.update({
          where: { id: session.id },
          data: { vapiCallId: callId, status: "in_progress" },
        });
        console.log(
          `[CallWorker] Call triggered for user ${userId}, session ${session.id}, vapiCallId ${callId}`
        );
      } catch (err) {
        console.error(`[CallWorker] Failed to trigger call for session ${session.id}:`, err);
        await prisma.session.update({
          where: { id: session.id },
          data: { status: "failed" },
        });
        throw err; // let BullMQ retry
      }
    },
    { connection: redis, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[CallWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
