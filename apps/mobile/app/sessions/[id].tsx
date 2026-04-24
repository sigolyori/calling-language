import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OpicGaugeBar } from "@/components/OpicGaugeBar";
import {
  ApiError,
  getSession,
  getTranscript,
  retryFeedback,
  type SessionDetail,
  type TranscriptData,
} from "@/lib/api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}분 ${s}초`;
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  async function load() {
    try {
      const s = await getSession(id);
      setSession(s);
      if (s.transcript && !transcript) {
        const t = await getTranscript(id).catch(() => null);
        if (t) setTranscript(t);
      }
      return s;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  // Poll when feedback is pending (max 2 min)
  useEffect(() => {
    if (session?.feedbackStatus !== "pending") return;
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      const s = await load();
      if (!s || s.feedbackStatus !== "pending" || pollCountRef.current >= 24) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session?.feedbackStatus]);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(null);
    try {
      await retryFeedback(id);
      await load();
    } catch (err) {
      setRetryError(err instanceof ApiError ? err.message : "재시도 실패");
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centerRoot}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.centerRoot}>
        <Text style={styles.muted}>세션을 찾을 수 없습니다</Text>
      </SafeAreaView>
    );
  }

  const fb = session.feedback;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{formatDate(session.createdAt)}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  session.status === "completed"
                    ? "#dcfce7"
                    : session.status === "failed"
                      ? "#fee2e2"
                      : "#f3f4f6",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    session.status === "completed"
                      ? "#16a34a"
                      : session.status === "failed"
                        ? "#dc2626"
                        : "#6b7280",
                },
              ]}
            >
              {session.status}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>통화 시간: {formatDuration(session.durationSecs)}</Text>
      </View>

      {fb ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>OPIc 수준</Text>
            <OpicGaugeBar level={fb.opicLevel} />
            <View style={styles.separator} />
            <Text style={styles.subTitle}>평가 근거</Text>
            <Text style={styles.paragraph}>{fb.opicRationale}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>종합 요약</Text>
            <Text style={styles.paragraph}>{fb.overallSummary}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
            <Text style={[styles.sectionTitle, { color: "#166534" }]}>잘한 점</Text>
            <Text style={[styles.paragraph, { color: "#166534" }]}>{fb.strengths}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#fef3c7", borderColor: "#fde68a" }]}>
            <Text style={[styles.sectionTitle, { color: "#92400e" }]}>개선할 점</Text>
            <Text style={[styles.paragraph, { color: "#92400e" }]}>{fb.improvements}</Text>
          </View>

          {fb.specificExamples.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>구체적 예시</Text>
              {fb.specificExamples.map((ex, i) => (
                <View key={i} style={styles.example}>
                  <Text style={styles.exampleWrong}>“{ex.original}”</Text>
                  <Text style={styles.exampleRight}>“{ex.corrected}”</Text>
                  <Text style={styles.exampleNote}>{ex.note}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.card}>
          {session.feedbackStatus === "pending" ? (
            <>
              <Text style={styles.emoji}>⏳</Text>
              <Text style={styles.noFbTitle}>피드백 생성 중</Text>
              <Text style={styles.noFbDesc}>잠시 후 자동으로 갱신됩니다.</Text>
              <TouchableOpacity
                style={[styles.retryButton, retrying && styles.buttonDisabled]}
                onPress={handleRetry}
                disabled={retrying}
              >
                <Text style={styles.retryText}>{retrying ? "생성 중..." : "지금 생성"}</Text>
              </TouchableOpacity>
            </>
          ) : session.feedbackStatus === "failed" ? (
            <>
              <Text style={styles.emoji}>⚠️</Text>
              <Text style={styles.noFbTitle}>피드백 생성 실패</Text>
              {session.feedbackError && (
                <Text style={styles.noFbError}>{session.feedbackError}</Text>
              )}
              <TouchableOpacity
                style={[styles.retryButton, retrying && styles.buttonDisabled]}
                onPress={handleRetry}
                disabled={retrying}
              >
                <Text style={styles.retryText}>{retrying ? "재시도 중..." : "재시도"}</Text>
              </TouchableOpacity>
            </>
          ) : session.feedbackStatus === "too_short" ? (
            <>
              <Text style={styles.emoji}>🗒️</Text>
              <Text style={styles.noFbTitle}>통화가 너무 짧습니다</Text>
              <Text style={styles.noFbDesc}>30 단어 미만이라 피드백을 생성하지 않았습니다.</Text>
            </>
          ) : (
            <>
              <Text style={styles.emoji}>📋</Text>
              <Text style={styles.noFbTitle}>피드백이 없습니다</Text>
            </>
          )}
          {retryError && <Text style={styles.noFbError}>{retryError}</Text>}
        </View>
      )}

      {transcript && (
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setShowTranscript((v) => !v)}
            style={styles.transcriptHeader}
          >
            <Text style={styles.sectionTitle}>통화 기록</Text>
            <Text style={styles.toggle}>{showTranscript ? "숨기기" : "보기"}</Text>
          </TouchableOpacity>

          {showTranscript && (
            <View style={{ marginTop: 12 }}>
              {transcript.content.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.msgRow,
                    msg.role === "user" && { alignItems: "flex-end" },
                  ]}
                >
                  <View
                    style={[
                      styles.msgBubble,
                      msg.role === "assistant" ? styles.msgBot : styles.msgUser,
                    ]}
                  >
                    <Text
                      style={[
                        styles.msgText,
                        msg.role === "user" && { color: "#fff" },
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 16, paddingBottom: 48 },
  centerRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  muted: { color: "#6b7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 13, color: "#6b7280", marginTop: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 10 },
  subTitle: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  paragraph: { fontSize: 14, color: "#4b5563", lineHeight: 22 },
  separator: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 14 },
  example: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  exampleWrong: {
    color: "#dc2626",
    textDecorationLine: "line-through",
    fontSize: 13,
    marginBottom: 4,
  },
  exampleRight: { color: "#16a34a", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  exampleNote: { color: "#6b7280", fontSize: 12 },
  emoji: { fontSize: 40, textAlign: "center", marginBottom: 8 },
  noFbTitle: { fontSize: 16, fontWeight: "700", textAlign: "center", color: "#374151" },
  noFbDesc: { fontSize: 13, textAlign: "center", color: "#6b7280", marginTop: 4 },
  noFbError: {
    fontSize: 12,
    color: "#dc2626",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "monospace",
  },
  retryButton: {
    alignSelf: "center",
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#16a34a",
  },
  buttonDisabled: { opacity: 0.6 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  transcriptHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggle: { fontSize: 13, color: "#16a34a", fontWeight: "500" },
  msgRow: { marginBottom: 8, alignItems: "flex-start" },
  msgBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, maxWidth: "80%" },
  msgBot: { backgroundColor: "#f3f4f6" },
  msgUser: { backgroundColor: "#16a34a" },
  msgText: { fontSize: 13, color: "#111827", lineHeight: 18 },
});
