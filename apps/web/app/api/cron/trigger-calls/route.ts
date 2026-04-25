import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { createCallSession } from "@/lib/server/session-create";
import { sendIncomingCallPush } from "@/lib/server/push";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const allSchedules = await prisma.schedule.findMany({
    where: { isActive: true },
    include: { user: { include: { deviceTokens: true } } },
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

    const deviceTokens = schedule.user.deviceTokens;
    if (deviceTokens.length === 0) {
      console.warn(
        `[Cron] No DeviceToken for user ${schedule.userId} — skipping (PSTN deprecated)`,
      );
      results.push({ userId: schedule.userId, status: "no_device_token" });
      continue;
    }

    try {
      const { sessionId } = await createCallSession({
        userId: schedule.userId,
        callType: "webrtc",
        scheduleId: schedule.id,
      });
      const pushResults = await Promise.all(
        deviceTokens.map((dt) =>
          sendIncomingCallPush({ fcmToken: dt.fcmToken, sessionId }),
        ),
      );
      const anyOk = pushResults.some((r) => r.ok);
      if (!anyOk) {
        const errs = pushResults.map((r) => r.error).filter(Boolean).join(" | ");
        console.error(`[Cron] All pushes failed for user ${schedule.userId}: ${errs}`);
        await prisma.session.update({ where: { id: sessionId }, data: { status: "failed" } });
        results.push({ userId: schedule.userId, status: "push_failed" });
      } else {
        results.push({ userId: schedule.userId, status: "pushed" });
      }
    } catch (err) {
      console.error(`[Cron] Failed for user ${schedule.userId}:`, err);
      results.push({ userId: schedule.userId, status: "failed" });
    }
  }

  return NextResponse.json({
    time: now.toISOString(),
    checked: allSchedules.length,
    pushed: results.filter((r) => r.status === "pushed").length,
    results,
  });
}
