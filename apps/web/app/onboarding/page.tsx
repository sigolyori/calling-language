"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSchedule } from "@/lib/api";

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [timeHHMM, setTimeHHMM] = useState("09:00");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDays.length === 0) {
      setError("Please select at least one day.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await createSchedule({ daysOfWeek: selectedDays, timeHHMM });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">📅</div>
          <h1 className="text-2xl font-bold">Set your call schedule</h1>
          <p className="text-gray-500 text-sm mt-1">
            We&apos;ll call you at this time to practice English
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="label">Practice days</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDays.includes(d.value)
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="time">Call time</label>
            <input
              id="time"
              type="time"
              className="input"
              value={timeHHMM}
              onChange={(e) => setTimeHHMM(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              UTC 기준 시간으로 입력하세요. 한국(KST)은 UTC+9 입니다.
              예) 오전 9시 KST → 00:00 UTC, 오후 9시 KST → 12:00 UTC
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <strong>How it works:</strong> At the scheduled time, our AI coach
            will call your phone for a 10–15 min English conversation. You&apos;ll
            receive personalized feedback after each session.
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Saving..." : "Start my practice schedule"}
          </button>
        </form>
      </div>
    </main>
  );
}
