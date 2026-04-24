import { NextRequest, NextResponse } from "next/server";
import { getUserId, unauthorized } from "@/lib/server/auth";
import { createCallSession } from "@/lib/server/session-create";
import { env } from "@/lib/server/env";

export async function POST(req: NextRequest) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? env.VAPI_ASSISTANT_ID;
  if (!publicKey || !assistantId) {
    return NextResponse.json(
      { error: "Vapi Web SDK is not configured (NEXT_PUBLIC_VAPI_PUBLIC_KEY / NEXT_PUBLIC_VAPI_ASSISTANT_ID)" },
      { status: 503 },
    );
  }

  const { sessionId, overrides } = await createCallSession({
    userId: uid,
    callType: "webrtc",
  });

  return NextResponse.json({
    ok: true,
    sessionId,
    assistantId,
    assistantOverrides: overrides,
    publicKey,
  });
}
