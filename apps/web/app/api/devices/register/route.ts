import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const { fcmToken, platform } = (await req.json().catch(() => ({}))) as {
    fcmToken?: string;
    platform?: string;
  };

  if (!fcmToken || !platform) {
    return NextResponse.json({ error: "fcmToken and platform required" }, { status: 400 });
  }
  if (platform !== "android" && platform !== "ios") {
    return NextResponse.json({ error: "platform must be android or ios" }, { status: 400 });
  }

  const token = await prisma.deviceToken.upsert({
    where: { fcmToken },
    create: { userId: uid, fcmToken, platform },
    update: { userId: uid, platform, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true, id: token.id });
}
