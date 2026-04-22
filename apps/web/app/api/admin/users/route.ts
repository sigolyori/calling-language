import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getAdminUserId, unauthorized } from "@/lib/server/auth";

// GET /api/admin/users — list all users with their schedules and session counts
export async function GET(req: NextRequest) {
  if (!await getAdminUserId(req)) return unauthorized();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phoneNumber: true,
      englishLevel: true,
      timezone: true,
      createdAt: true,
      schedules: {
        select: { id: true, daysOfWeek: true, timeHHMM: true, isActive: true, createdAt: true },
      },
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
