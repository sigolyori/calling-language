"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getSession,
  getTranscript,
  type SessionDetail,
  type TranscriptData,
} from "@/lib/api";
import { OpicGaugeBar } from "@/components/OpicGaugeBar";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const s = await getSession(id);
        setSession(s);
        if (s.transcript) {
          const t = await getTranscript(id);
          setTranscript(t);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Session not found.</div>
      </main>
    );
  }

  const fb = session.feedback;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Back
          </Link>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm font-medium">Session detail</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Session meta */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold">
                {formatDate(session.createdAt)}
              </h1>
              <div className="text-sm text-gray-500 mt-1">
                Duration: {formatDuration(session.durationSecs)}
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                session.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : session.status === "failed"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {session.status}
            </span>
          </div>
        </div>

        {/* Feedback */}
        {fb ? (
          <>
            {/* OPIc level gauge */}
            <div className="card">
              <h2 className="font-semibold mb-4">OPIc 수준</h2>
              <OpicGaugeBar level={fb.opicLevel} />
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">평가 근거</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{fb.opicRationale}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="card">
              <h2 className="font-semibold mb-2">Overall</h2>
              <p className="text-gray-700 text-sm leading-relaxed">
                {fb.overallSummary}
              </p>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card bg-green-50 border-green-100">
                <h2 className="font-semibold text-green-800 mb-2">
                  What you did well
                </h2>
                <p className="text-sm text-green-700 leading-relaxed">
                  {fb.strengths}
                </p>
              </div>
              <div className="card bg-amber-50 border-amber-100">
                <h2 className="font-semibold text-amber-800 mb-2">
                  Areas to improve
                </h2>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {fb.improvements}
                </p>
              </div>
            </div>

            {/* Specific examples */}
            {fb.specificExamples.length > 0 && (
              <div className="card">
                <h2 className="font-semibold mb-4">Specific examples</h2>
                <div className="space-y-4">
                  {fb.specificExamples.map((ex, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <div className="text-red-600 line-through mb-1">
                        &ldquo;{ex.original}&rdquo;
                      </div>
                      <div className="text-green-700 font-medium mb-1">
                        &ldquo;{ex.corrected}&rdquo;
                      </div>
                      <div className="text-gray-500 text-xs">{ex.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card text-center text-gray-500 py-8">
            {session.feedbackUnavailableReason === "no_api_key" ? (
              <>
                <div className="text-3xl mb-2">🔑</div>
                <p className="font-medium text-gray-700">평가를 생성할 수 없습니다</p>
                <p className="text-sm mt-1">ANTHROPIC_API_KEY가 설정되지 않아 평가가 생성되지 않았습니다.</p>
              </>
            ) : session.status === "completed" ? (
              <>
                <div className="text-3xl mb-2">⏳</div>
                <p>Feedback is being generated. Check back in a minute.</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">📋</div>
                <p>No feedback available for this session.</p>
              </>
            )}
          </div>
        )}

        {/* Transcript toggle */}
        {transcript && (
          <div className="card">
            <button
              onClick={() => setShowTranscript((v) => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <h2 className="font-semibold">Transcript</h2>
              <span className="text-sm text-gray-500">
                {showTranscript ? "Hide" : "Show"}
              </span>
            </button>

            {showTranscript && (
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {transcript.content.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 text-sm ${
                      msg.role === "assistant" ? "" : "flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`px-3 py-2 rounded-lg max-w-xs ${
                        msg.role === "assistant"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-brand-600 text-white"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
