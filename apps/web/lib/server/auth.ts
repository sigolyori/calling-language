import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { env } from "./env";
import { prisma } from "./prisma";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }
}

export function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = verifyToken(auth.slice(7));
  return payload?.sub ?? null;
}

export async function getAdminUserId(req: NextRequest): Promise<string | null> {
  const uid = getUserId(req);
  if (!uid) return null;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (adminEmails.length === 0) return null;
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { email: true } });
  if (!user || !adminEmails.includes(user.email)) return null;
  return uid;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
