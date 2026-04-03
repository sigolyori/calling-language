import { callQueue } from "./callQueue.js";

/**
 * Convert a schedule (daysOfWeek + timeHHMM + IANA timezone) into a UTC cron expression.
 * BullMQ cron runs in UTC, so we offset the user's local time.
 *
 * daysOfWeek: 1=Mon … 7=Sun (ISO weekday)
 * Returns one cron expression per day combination would be complex; instead we
 * register a separate repeatable job per day-of-week.
 */
function buildCronExpression(timeHHMM: string, dayOfWeek: number): string {
  // dayOfWeek: 1-7 (ISO) → cron: 0=Sun,1=Mon…6=Sat (standard cron)
  // We store daysOfWeek as ISO (Mon=1..Sun=7), cron uses Sun=0..Sat=6
  const cronDay = dayOfWeek === 7 ? 0 : dayOfWeek;
  const [hour, minute] = timeHHMM.split(":").map(Number);
  // NOTE: In a production system we'd convert the local HH:MM to UTC using the
  // user's timezone. For MVP simplicity we treat timeHHMM as UTC.
  // TODO: Use date-fns-tz to properly convert to UTC before registering.
  return `${minute} ${hour} * * ${cronDay}`;
}

export async function registerScheduleJobs(scheduleId: string, userId: string, daysOfWeek: number[], timeHHMM: string) {
  for (const day of daysOfWeek) {
    const cronExpr = buildCronExpression(timeHHMM, day);
    const jobKey = `schedule:${scheduleId}:day:${day}`;

    await callQueue.add(
      "trigger-call",
      { userId, scheduleId },
      {
        repeat: { pattern: cronExpr },
        jobId: jobKey,
      }
    );
    console.log(`[Scheduler] Registered cron "${cronExpr}" for job ${jobKey}`);
  }
}

export async function removeScheduleJobs(scheduleId: string, daysOfWeek: number[], timeHHMM: string) {
  for (const day of daysOfWeek) {
    const cronExpr = buildCronExpression(timeHHMM, day);
    const jobKey = `schedule:${scheduleId}:day:${day}`;
    await callQueue.removeRepeatable("trigger-call", { pattern: cronExpr }, jobKey);
    console.log(`[Scheduler] Removed cron job ${jobKey}`);
  }
}
