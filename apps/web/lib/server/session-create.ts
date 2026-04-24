import type { CallType } from "@prisma/client";
import { prisma } from "./prisma";
import { prepareAssistantOverrides } from "./call-prep";
import type { AssistantOverrides } from "./prompts/injection-builder";

export async function createCallSession(params: {
  userId: string;
  callType: CallType;
  scheduleId?: string | null;
}): Promise<{ sessionId: string; overrides: AssistantOverrides }> {
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      scheduleId: params.scheduleId ?? null,
      status: "scheduled",
      callType: params.callType,
    },
  });
  const overrides = await prepareAssistantOverrides(params.userId, session.id);
  return { sessionId: session.id, overrides };
}
