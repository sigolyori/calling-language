import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

const updateSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional(),
  timeHHMM: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const existing = await prisma.schedule.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const updated = await prisma.schedule.update({ where: { id: params.id }, data: body.data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const existing = await prisma.schedule.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.schedule.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
