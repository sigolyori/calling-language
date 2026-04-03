import { createHmac } from "crypto";
import { env } from "./env";

interface VapiCallResponse { id: string; status: string }

export async function triggerOutboundCall(phoneNumber: string, sessionId: string): Promise<string> {
  if (!env.VAPI_API_KEY || !env.VAPI_ASSISTANT_ID || !env.VAPI_PHONE_NUMBER_ID) {
    console.log(`[Vapi STUB] Would call ${phoneNumber} for session ${sessionId}`);
    return `stub-call-${sessionId}`;
  }

  const res = await fetch("https://api.vapi.ai/call/phone", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.VAPI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumberId: env.VAPI_PHONE_NUMBER_ID,
      assistantId: env.VAPI_ASSISTANT_ID,
      customer: { number: phoneNumber },
      assistantOverrides: { metadata: { sessionId } },
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
