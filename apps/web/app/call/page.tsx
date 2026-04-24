"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { triggerWebrtcCall, type WebrtcCallPayload } from "@/lib/api";
import { CallRoom } from "@/components/call/CallRoom";

export default function CallPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<WebrtcCallPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await triggerWebrtcCall();
        if (!cancelled) setPayload(p);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/unauthorized/i.test(msg)) {
            router.push("/login");
            return;
          }
          setError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="font-semibold text-gray-900 mb-1">통화를 시작할 수 없습니다</div>
          <div className="text-sm text-gray-500 mb-4">{error}</div>
          <button className="btn-secondary" onClick={() => router.push("/dashboard")}>
            대시보드로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">세션 준비 중…</div>
      </main>
    );
  }

  return <CallRoom payload={payload} />;
}
