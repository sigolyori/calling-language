import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let initialized = false;

function ensureFirebaseInit(): boolean {
  if (initialized) return true;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn("[push] FIREBASE_SERVICE_ACCOUNT_JSON not set");
    return false;
  }
  try {
    const sa = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: sa.project_id,
          clientEmail: sa.client_email,
          privateKey: sa.private_key,
        }),
      });
    }
    initialized = true;
    return true;
  } catch (err) {
    console.error("[push] Failed to init firebase-admin", err);
    return false;
  }
}

export async function sendIncomingCallPush(params: {
  fcmToken: string;
  sessionId: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!ensureFirebaseInit()) {
    return { ok: false, error: "firebase not initialized" };
  }

  try {
    const messageId = await getMessaging().send({
      token: params.fcmToken,
      android: {
        priority: "high",
        ttl: 60_000,
        data: {
          type: "incoming_call",
          sessionId: params.sessionId,
          callerName: "Alex",
        },
      },
    });
    return { ok: true, messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
