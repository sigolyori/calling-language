import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";
import { prepareAssistantOverrides } from "@/lib/server/call-prep";
import { env } from "@/lib/server/env";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? env.VAPI_ASSISTANT_ID;
  if (!publicKey || !assistantId) {
    return NextResponse.json({ error: "Vapi Web SDK is not configured" }, { status: 503 });
  }

  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session || session.userId !== uid) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "scheduled") {
    return NextResponse.json(
      { error: `Session already ${session.status}` },
      { status: 409 },
    );
  }

  const assistantOverrides = await prepareAssistantOverrides(uid, session.id);

  return NextResponse.json({
    ok: true,
    assistantId,
    assistantOverrides,
    publicKey,
  });
}
