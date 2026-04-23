import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 10)));
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where: { userId: uid }, orderBy: { createdAt: "desc" }, skip, take: limit,
      include: { feedback: { select: { opicLevel: true, overallSummary: true } } },
    }),
    prisma.session.count({ where: { userId: uid } }),
  ]);
  return NextResponse.json({ sessions, total, page, limit });
}
