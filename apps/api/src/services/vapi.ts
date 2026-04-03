import { createHmac } from "crypto";
import { env } from "../lib/env.js";

const VAPI_BASE = "https://api.vapi.ai";

interface VapiCallResponse {
  id: string;
  status: string;
}

/**
 * Trigger an outbound call via Vapi.ai.
 * Returns the Vapi call ID on success.
 */
export async function triggerOutboundCall(
  phoneNumber: string,
  sessionId: string
): Promise<string> {
  if (!env.VAPI_API_KEY || !env.VAPI_ASSISTANT_ID || !env.VAPI_PHONE_NUMBER_ID) {
    // Stub mode for local development without Vapi credentials
    console.log(
      `[Vapi STUB] Would call ${phoneNumber} for session ${sessionId}`
    );
    return `stub-call-${sessionId}`;
  }

  const response = await fetch(`${VAPI_BASE}/call/phone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId: env.VAPI_PHONE_NUMBER_ID,
      assistantId: env.VAPI_ASSISTANT_ID,
      customer: {
        number: phoneNumber,
      },
      assistantOverrides: {
        metadata: { sessionId },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vapi API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as VapiCallResponse;
  return data.id;
}

/**
 * Validate the Vapi webhook HMAC-SHA256 signature.
 * Returns true if valid, or if no secret configured (dev mode).
 */
export function verifyVapiWebhook(
  rawBody: string,
  signature: string | undefined
): boolean {
  if (!env.VAPI_WEBHOOK_SECRET) return true; // dev mode: skip verification
  if (!signature) return false;

  const expected = createHmac("sha256", env.VAPI_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}
