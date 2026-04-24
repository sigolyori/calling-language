import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import Vapi from "@vapi-ai/react-native";

export type CallStatus =
  | "idle"
  | "requesting-mic"
  | "connecting"
  | "listening"
  | "speaking"
  | "ended"
  | "error";

export interface CallTranscriptMessage {
  role: "assistant" | "user";
  text: string;
  at: number;
}

export interface UseVapiCallOptions {
  publicKey: string;
  assistantId: string;
  assistantOverrides: Record<string, unknown>;
  onCallId?: (callId: string) => void;
  onEnd?: () => void;
}

interface VapiTranscriptMessage {
  type?: string;
  transcriptType?: "partial" | "final";
  role?: "assistant" | "user" | string;
  transcript?: string;
}

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "마이크 권한",
        message: "Alex와 통화하려면 마이크 권한이 필요합니다.",
        buttonPositive: "허용",
        buttonNegative: "취소",
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function useVapiCall(opts: UseVapiCallOptions) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CallTranscriptMessage[]>([]);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("requesting-mic");

    const granted = await requestMicPermission();
    if (!granted) {
      setError("마이크 권한이 필요합니다. 설정에서 허용해주세요.");
      setStatus("error");
      return;
    }

    setStatus("connecting");
    const vapi = new Vapi(opts.publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setStatus("listening");
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
    });
    vapi.on("speech-start", () => setStatus("speaking"));
    vapi.on("speech-end", () => setStatus("listening"));
    vapi.on("message", (m: VapiTranscriptMessage) => {
      if (m?.type === "transcript" && m.transcriptType === "final") {
        const role = m.role === "assistant" ? "assistant" : "user";
        setMessages((prev) => [
          ...prev,
          { role, text: m.transcript ?? "", at: Date.now() },
        ]);
      }
    });
    vapi.on("error", (e: unknown) => {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
            ? e.message
            : ((e as { message?: string } | null)?.message ?? "알 수 없는 오류");
      setError(msg);
      setStatus("error");
      clearTimer();
    });
    vapi.on("call-end", () => {
      setStatus("ended");
      clearTimer();
      opts.onEnd?.();
    });

    try {
      const call = await vapi.start(opts.assistantId, opts.assistantOverrides);
      if (call?.id) opts.onCallId?.(call.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
      clearTimer();
    }
  }, [opts, clearTimer]);

  const stop = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  const toggleMute = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi) return;
    const next = !muted;
    vapi.setMuted(next);
    setMuted(next);
  }, [muted]);

  useEffect(() => {
    return () => {
      clearTimer();
      vapiRef.current?.stop();
    };
  }, [clearTimer]);

  return { status, error, messages, muted, elapsed, start, stop, toggleMute };
}
