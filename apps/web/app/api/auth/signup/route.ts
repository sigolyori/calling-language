import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { signToken } from "@/lib/server/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phoneNumber: z.string().min(7),
  englishLevel: z.enum(["beginner", "intermediate"]),
  timezone: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { email, password, name, phoneNumber, englishLevel, timezone } = body.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, phoneNumber, englishLevel, timezone },
    select: { id: true, email: true, name: true, englishLevel: true, timezone: true },
  });

  const token = signToken(user.id);
  return NextResponse.json({ token, user }, { status: 201 });
}
