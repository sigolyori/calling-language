"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

interface VapiMessage {
  type?: string;
  transcriptType?: "partial" | "final";
  role?: "assistant" | "user" | string;
  transcript?: string;
}

interface VapiInstance {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  start: (
    assistantId: string,
    overrides?: Record<string, unknown>,
  ) => Promise<{ id?: string } | null>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
}

export function useVapiCall(opts: UseVapiCallOptions) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CallTranscriptMessage[]>([]);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const vapiRef = useRef<VapiInstance | null>(null);
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
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("마이크 권한이 필요합니다. 브라우저 권한을 허용해주세요.");
      setStatus("error");
      return;
    }

    setStatus("connecting");
    const mod = await import("@vapi-ai/web");
    const Vapi = (mod as { default?: unknown }).default ?? mod;
    const vapi = new (Vapi as new (key: string) => VapiInstance)(opts.publicKey);
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
    vapi.on("message", (...args: unknown[]) => {
      const m = args[0] as VapiMessage;
      if (m?.type === "transcript" && m.transcriptType === "final") {
        const role = m.role === "assistant" ? "assistant" : "user";
        setMessages((prev) => [
          ...prev,
          { role, text: m.transcript ?? "", at: Date.now() },
        ]);
      }
    });
    vapi.on("error", (...args: unknown[]) => {
      const e = args[0] as { message?: string } | string;
      setError(typeof e === "string" ? e : e?.message ?? "알 수 없는 오류");
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
    const onBeforeUnload = () => vapiRef.current?.stop();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimer();
      vapiRef.current?.stop();
    };
  }, [clearTimer]);

  return { status, error, messages, muted, elapsed, start, stop, toggleMute };
}
