import { NextRequest, NextResponse } from "next/server";
import { getUserId, unauthorized } from "@/lib/server/auth";
import { loadProfile } from "@/lib/server/profiles";
import { prisma } from "@/lib/server/prisma";

export async function GET(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const [profile, row] = await Promise.all([
    loadProfile(uid),
    prisma.learnerProfile.findUnique({
      where: { userId: uid },
      select: { createdAt: true, updatedAt: true },
    }),
  ]);

  if (!profile || !row) {
    return NextResponse.json({ profile: null, createdAt: null, updatedAt: null });
  }

  return NextResponse.json({
    profile,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
