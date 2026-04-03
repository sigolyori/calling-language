import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

const createSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function GET(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const schedules = await prisma.schedule.findMany({ where: { userId: uid }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const schedule = await prisma.schedule.create({ data: { userId: uid, ...body.data } });
  return NextResponse.json(schedule, { status: 201 });
}
