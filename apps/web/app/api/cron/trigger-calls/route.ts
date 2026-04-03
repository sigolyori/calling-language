import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { triggerOutboundCall } from "@/lib/server/vapi";

// Vercel Cron calls this endpoint every minute.
// It checks which schedules match the current UTC day+time and triggers calls.
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentDay = now.getUTCDay() === 0 ? 7 : now.getUTCDay(); // ISO: Mon=1..Sun=7
  const currentHHMM = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

  const schedules = await prisma.schedule.findMany({
    where: { isActive: true, timeHHMM: currentHHMM, daysOfWeek: { has: currentDay } },
    include: { user: true },
  });

  const results: { userId: string; status: string }[] = [];
  for (const schedule of schedules) {
    try {
      const session = await prisma.session.create({
        data: { userId: schedule.userId, scheduleId: schedule.id, status: "scheduled" },
      });
      const callId = await triggerOutboundCall(schedule.user.phoneNumber, session.id);
      await prisma.session.update({ where: { id: session.id }, data: { vapiCallId: callId, status: "in_progress" } });
      results.push({ userId: schedule.userId, status: "called" });
    } catch (err) {
      console.error(`[Cron] Failed for user ${schedule.userId}:`, err);
      results.push({ userId: schedule.userId, status: "failed" });
    }
  }

  return NextResponse.json({ time: currentHHMM, day: currentDay, triggered: results.length, results });
}
