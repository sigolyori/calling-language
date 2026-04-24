import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { triggerOutboundCall } from "@/lib/server/vapi";
import { createCallSession } from "@/lib/server/session-create";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Load all active schedules and match against each user's local time
  const allSchedules = await prisma.schedule.findMany({
    where: { isActive: true },
    include: { user: true },
  });

  const matching = allSchedules.filter((schedule) => {
    const tz = schedule.user.timezone;
    const localNow = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const localDay = localNow.getDay() === 0 ? 7 : localNow.getDay(); // Mon=1..Sun=7
    const localHHMM = `${String(localNow.getHours()).padStart(2, "0")}:${String(localNow.getMinutes()).padStart(2, "0")}`;
    return schedule.daysOfWeek.includes(localDay) && schedule.timeHHMM === localHHMM;
  });

  const results: { userId: string; status: string }[] = [];

  for (const schedule of matching) {
    // Duplicate prevention: skip if a non-failed session was created in the last 10 minutes
    const recent = await prisma.session.findFirst({
      where: {
        scheduleId: schedule.id,
        status: { not: "failed" },
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recent) {
      results.push({ userId: schedule.userId, status: "skipped_duplicate" });
      continue;
    }

    try {
      const { sessionId, overrides } = await createCallSession({
        userId: schedule.userId,
        callType: "pstn",
        scheduleId: schedule.id,
      });
      const callId = await triggerOutboundCall(schedule.user.phoneNumber, sessionId, overrides);
      await prisma.session.update({
        where: { id: sessionId },
        data: { vapiCallId: callId, status: "in_progress" },
      });
      results.push({ userId: schedule.userId, status: "called" });
    } catch (err) {
      console.error(`[Cron] Failed for user ${schedule.userId}:`, err);
      results.push({ userId: schedule.userId, status: "failed" });
    }
  }

  const localTime = now.toISOString();
  return NextResponse.json({ time: localTime, checked: allSchedules.length, triggered: results.filter(r => r.status === "called").length, results });
}
