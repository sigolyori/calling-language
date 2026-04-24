interface ExpoPushMessage {
  to: string;
  priority?: "default" | "high" | "normal";
  channelId?: string;
  ttl?: number;
  data?: Record<string, unknown>;
  title?: string;
  body?: string;
  sound?: string | null;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket | ExpoPushTicket[];
  errors?: Array<{ code: string; message: string }>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendIncomingCallPush(params: {
  expoPushToken: string;
  sessionId: string;
}): Promise<{ ok: boolean; ticket?: ExpoPushTicket; error?: string }> {
  const message: ExpoPushMessage = {
    to: params.expoPushToken,
    priority: "high",
    channelId: "incoming-call",
    ttl: 60,
    sound: null,
    data: {
      type: "incoming_call",
      sessionId: params.sessionId,
      callerName: "Alex",
    },
  };

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Expo push HTTP ${res.status}: ${text}` };
    }

    const payload = (await res.json()) as ExpoPushResponse;
    if (payload.errors?.length) {
      return { ok: false, error: payload.errors.map((e) => e.message).join("; ") };
    }

    const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;
    if (ticket?.status === "error") {
      return { ok: false, ticket, error: ticket.message ?? "push error" };
    }
    return { ok: true, ticket };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
