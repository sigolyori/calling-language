"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Schedule {
  id: string;
  daysOfWeek: number[];
  timeHHMM: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  englishLevel: string;
  timezone: string;
  createdAt: string;
  schedules: Schedule[];
  _count: { sessions: number };
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") ?? "";
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers as Record<string, string>),
    },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  return res;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch((e) => {
        if (e.message === "Unauthorized") router.push("/login");
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleDelete(scheduleId: string, userId: string) {
    if (!confirm("Delete this schedule?")) return;
    await adminFetch(`/api/admin/schedules/${scheduleId}`, { method: "DELETE" });
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, schedules: u.schedules.filter((s) => s.id !== scheduleId) }
          : u
      )
    );
  }

  async function handleToggle(schedule: Schedule, userId: string) {
    const res = await adminFetch(`/api/admin/schedules/${schedule.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !schedule.isActive }),
    });
    const updated = await res.json();
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, schedules: u.schedules.map((s) => (s.id === schedule.id ? updated : s)) }
          : u
      )
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Admin — Calling Language</span>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Users ({users.length})</h1>
        </div>

        {users.map((user) => (
          <div key={user.id} className="card space-y-4">
            {/* User header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="text-sm text-gray-500">{user.phoneNumber} · {user.timezone} · {user.englishLevel}</div>
              </div>
              <div className="text-right text-xs text-gray-400">
                <div>{user._count.sessions} sessions</div>
                <div>joined {new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Schedules */}
            {user.schedules.length === 0 ? (
              <div className="text-sm text-gray-400">No schedules</div>
            ) : (
              <div className="space-y-2">
                {user.schedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="font-medium">
                        {s.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")}
                      </span>
                      <span className="text-gray-500 ml-2">at {s.timeHHMM} ({user.timezone})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {s.isActive ? "Active" : "Paused"}
                      </span>
                      <button
                        onClick={() => handleToggle(s, user.id)}
                        className="text-xs text-blue-500 hover:text-blue-700"
                      >
                        {s.isActive ? "Pause" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, user.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
