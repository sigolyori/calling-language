import Link from "next/link";
import type { SessionSummary } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  scheduled: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-700",
  missed: "bg-orange-100 text-orange-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(secs: number | null) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export function SessionCard({ session }: { session: SessionSummary }) {
  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <div className="card hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  STATUS_STYLES[session.status] ?? STATUS_STYLES.scheduled
                }`}
              >
                {session.status.replace("_", " ")}
              </span>
              {session.durationSecs && (
                <span className="text-xs text-gray-500">
                  {formatDuration(session.durationSecs)}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(session.createdAt)}
            </div>
            {session.feedback?.overallSummary && (
              <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                {session.feedback.overallSummary}
              </p>
            )}
          </div>

          {session.feedback && (
            <div className="shrink-0 text-right">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">OPIc</div>
              <div className="text-lg font-bold text-gray-900">{session.feedback.opicLevel}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
