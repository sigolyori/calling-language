import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { SessionSummary } from "@/lib/api";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}분 ${s}초`;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  scheduled: { label: "예정", color: "#6b7280" },
  in_progress: { label: "통화중", color: "#2563eb" },
  completed: { label: "완료", color: "#16a34a" },
  failed: { label: "실패", color: "#dc2626" },
  missed: { label: "부재중", color: "#f59e0b" },
};

export function SessionCard({ session }: { session: SessionSummary }) {
  const router = useRouter();
  const status = STATUS_LABEL[session.status] ?? { label: session.status, color: "#6b7280" };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/sessions/${session.id}`)}
    >
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate(session.createdAt)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {session.feedback && (
        <View style={styles.opicRow}>
          <Text style={styles.opicLevel}>{session.feedback.opicLevel}</Text>
          <Text style={styles.summary} numberOfLines={2}>
            {session.feedback.overallSummary}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>⏱ {formatDuration(session.durationSecs)}</Text>
        {session.callType && (
          <Text style={styles.footerText}>
            {session.callType === "webrtc" ? "🎧 브라우저" : "📞 전화"}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  date: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "600" },
  opicRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginVertical: 4 },
  opicLevel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16a34a",
    minWidth: 48,
  },
  summary: { flex: 1, fontSize: 13, color: "#4b5563", lineHeight: 18 },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  footerText: { fontSize: 12, color: "#6b7280" },
});
