"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVapiCall, type CallStatus } from "@/lib/client/useVapiCall";
import { patchVapiCallId, type WebrtcCallPayload } from "@/lib/api";

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<CallStatus, string> = {
  idle: "준비",
  "requesting-mic": "마이크 권한 확인 중",
  connecting: "연결 중…",
  listening: "당신 차례",
  speaking: "Alex가 말하는 중",
  ended: "통화 종료",
  error: "오류",
};

export function CallRoom({ payload }: { payload: WebrtcCallPayload }) {
  const router = useRouter();
  const [showTranscript, setShowTranscript] = useState(true);
  const autoStartedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const {
    status,
    error,
    messages,
    muted,
    elapsed,
    start,
    stop,
    toggleMute,
  } = useVapiCall({
    publicKey: payload.publicKey,
    assistantId: payload.assistantId,
    assistantOverrides: payload.assistantOverrides,
    onCallId: (callId) => {
      patchVapiCallId(payload.sessionId, callId).catch((e) =>
        console.error("[CallRoom] patchVapiCallId failed", e),
      );
    },
    onEnd: () => {
      setTimeout(() => router.push(`/sessions/${payload.sessionId}`), 800);
    },
  });

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    start();
  }, [start]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const isLive = status === "listening" || status === "speaking";

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎧</span>
          <span className="font-semibold">브라우저 통화</span>
        </div>
        <div className="text-sm text-gray-400 font-mono">
          {isLive ? formatElapsed(elapsed) : "--:--"}
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl mb-6 transition-all ${
            status === "speaking"
              ? "bg-brand-600 animate-pulse"
              : status === "listening"
              ? "bg-green-600"
              : status === "error"
              ? "bg-red-600"
              : "bg-gray-700"
          }`}
        >
          {status === "speaking" ? "🗣️" : status === "listening" ? "👂" : status === "error" ? "⚠️" : "⏳"}
        </div>

        <div className="text-lg font-medium mb-1">Alex</div>
        <div className="text-sm text-gray-400 mb-4">{STATUS_LABEL[status]}</div>

        {error && (
          <div className="text-sm text-red-400 mb-4 max-w-sm">{error}</div>
        )}

        {status === "error" && (
          <button className="btn-secondary" onClick={() => router.push("/dashboard")}>
            대시보드로 돌아가기
          </button>
        )}
      </section>

      {showTranscript && messages.length > 0 && (
        <section className="border-t border-gray-800 max-h-64 overflow-y-auto px-4 py-3 bg-gray-950">
          <div className="max-w-xl mx-auto space-y-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm ${m.role === "assistant" ? "text-brand-300" : "text-gray-200"}`}
              >
                <span className="font-medium mr-2">
                  {m.role === "assistant" ? "Alex" : "You"}:
                </span>
                {m.text}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </section>
      )}

      {isLive && (
        <footer className="px-4 py-4 border-t border-gray-800 flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
              muted ? "bg-yellow-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
            aria-label={muted ? "음소거 해제" : "음소거"}
          >
            {muted ? "🔇" : "🎤"}
          </button>
          <button
            onClick={stop}
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-red-600 hover:bg-red-700"
            aria-label="통화 종료"
          >
            📞
          </button>
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl bg-gray-700 hover:bg-gray-600"
            aria-label={showTranscript ? "자막 숨기기" : "자막 보기"}
          >
            {showTranscript ? "💬" : "💭"}
          </button>
        </footer>
      )}
    </main>
  );
}
