import { createHmac } from "crypto";
import { env } from "./env";
import type { AssistantOverrides } from "./prompts/injection-builder";

interface VapiCallResponse { id: string; status: string }

export async function triggerOutboundCall(
  phoneNumber: string,
  sessionId: string,
  overrides?: AssistantOverrides,
): Promise<string> {
  if (!env.VAPI_API_KEY || !env.VAPI_ASSISTANT_ID || !env.VAPI_PHONE_NUMBER_ID) {
    console.log(`[Vapi STUB] Would call ${phoneNumber} for session ${sessionId}`);
    return `stub-call-${sessionId}`;
  }

  const assistantOverrides: AssistantOverrides = {
    ...overrides,
    metadata: { ...(overrides?.metadata ?? {}), sessionId },
  };

  const systemPromptSize = assistantOverrides.model?.messages?.[0]?.content.length ?? 0;
  console.log(
    `[Vapi] Calling ${phoneNumber} sessionId=${sessionId} systemPromptBytes=${systemPromptSize} firstMessage=${assistantOverrides.firstMessage ? "set" : "default"}`,
  );

  const res = await fetch("https://api.vapi.ai/call/phone", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.VAPI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumberId: env.VAPI_PHONE_NUMBER_ID,
      assistantId: env.VAPI_ASSISTANT_ID,
      customer: { number: phoneNumber },
      assistantOverrides,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as VapiCallResponse;
  return data.id;
}

export function verifyVapiWebhook(rawBody: string, signature: string | undefined): boolean {
  if (!env.VAPI_WEBHOOK_SECRET) return true;
  if (!signature) return false;
  const expected = createHmac("sha256", env.VAPI_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return expected === signature;
}
