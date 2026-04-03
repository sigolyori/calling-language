"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMe,
  getSessions,
  getSchedules,
  deleteSchedule,
  clearToken,
  type User,
  type SessionSummary,
  type Schedule,
} from "@/lib/api";
import { SessionCard } from "@/components/SessionCard";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      const [me, sessData, scheds] = await Promise.all([
        getMe(),
        getSessions(page),
        getSchedules(),
      ]);
      setUser(me);
      setSessions(sessData.sessions);
      setTotal(sessData.total);
      setSchedules(scheds);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeleteSchedule(id: string) {
    if (!confirm("Delete this schedule?")) return;
    await deleteSchedule(id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    );
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📞</span>
            <span className="font-semibold text-gray-900">AI English Coach</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Schedules */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your call schedule</h2>
            <Link href="/onboarding" className="btn-secondary text-xs">
              + Add schedule
            </Link>
          </div>

          {schedules.length === 0 ? (
            <div className="card text-center text-gray-500 py-8">
              <div className="text-3xl mb-2">📅</div>
              <p>No schedule set.</p>
              <Link href="/onboarding" className="btn-primary mt-4 inline-block">
                Set your schedule
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <div key={s.id} className="card flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {s.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")}
                    </div>
                    <div className="text-gray-500 text-sm">at {s.timeHHMM}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.isActive ? "Active" : "Paused"}
                    </span>
                    <button
                      onClick={() => handleDeleteSchedule(s.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sessions history */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Session history{" "}
            <span className="text-gray-400 font-normal text-sm">({total})</span>
          </h2>

          {sessions.length === 0 ? (
            <div className="card text-center text-gray-500 py-8">
              <div className="text-3xl mb-2">🤖</div>
              <p>No sessions yet. Your first call will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                className="btn-secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="flex items-center text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                className="btn-secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
