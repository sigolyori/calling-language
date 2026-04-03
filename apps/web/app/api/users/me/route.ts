import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

const select = { id: true, email: true, name: true, phoneNumber: true, englishLevel: true, timezone: true, createdAt: true };
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phoneNumber: z.string().min(7).optional(),
  englishLevel: z.enum(["beginner", "intermediate"]).optional(),
  timezone: z.string().min(1).optional(),
});

export async function GET(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const user = await prisma.user.findUnique({ where: { id: uid }, select });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const user = await prisma.user.update({ where: { id: uid }, data: body.data, select });
  return NextResponse.json(user);
}
