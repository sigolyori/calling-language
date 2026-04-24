import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const { expoPushToken, platform } = (await req.json().catch(() => ({}))) as {
    expoPushToken?: string;
    platform?: string;
  };

  if (!expoPushToken || !platform) {
    return NextResponse.json({ error: "expoPushToken and platform required" }, { status: 400 });
  }
  if (platform !== "android" && platform !== "ios") {
    return NextResponse.json({ error: "platform must be android or ios" }, { status: 400 });
  }

  const token = await prisma.deviceToken.upsert({
    where: { expoPushToken },
    create: { userId: uid, expoPushToken, platform },
    update: { userId: uid, platform, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true, id: token.id });
}
