"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { changePassword, clearToken } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.newPassword.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (form.currentPassword === form.newPassword) {
      setError("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        clearToken();
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <Link href="/dashboard" className="text-3xl">📞</Link>
          <h1 className="text-2xl font-bold mt-3">비밀번호 변경</h1>
          <p className="text-gray-500 text-sm mt-1">새 비밀번호로 업데이트합니다</p>
        </div>

        {success ? (
          <div className="card bg-green-50 border border-green-200 text-green-800">
            <p className="font-medium">비밀번호가 변경되었습니다.</p>
            <p className="text-sm mt-1">잠시 후 로그인 페이지로 이동합니다…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="currentPassword">현재 비밀번호</label>
              <input
                id="currentPassword"
                type="password"
                className="input"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="label" htmlFor="newPassword">새 비밀번호</label>
              <input
                id="newPassword"
                type="password"
                className="input"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">8자 이상</p>
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">새 비밀번호 확인</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>

            <Link
              href="/dashboard"
              className="block text-center text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
