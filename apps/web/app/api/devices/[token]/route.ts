import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const { count } = await prisma.deviceToken.deleteMany({
    where: { fcmToken: params.token, userId: uid },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
