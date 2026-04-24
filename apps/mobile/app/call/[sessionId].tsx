import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import {
  ApiError,
  hydrateSession,
  patchVapiCallId,
  type HydrateSessionPayload,
} from "@/lib/api";
import { useVapiCall, type CallStatus } from "@/lib/useVapiCall";

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

export default function CallScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string; mode?: string }>();
  const [payload, setPayload] = useState<HydrateSessionPayload | null>(null);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await hydrateSession(sessionId);
        setPayload(p);
      } catch (err) {
        setHydrateError(err instanceof ApiError ? err.message : "세션 준비 실패");
      }
    })();
  }, [sessionId]);

  if (hydrateError) {
    return (
      <SafeAreaView style={styles.errorRoot}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.errorTitle}>통화를 시작할 수 없습니다</Text>
        <Text style={styles.errorText}>{hydrateError}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!payload) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.loadingText}>세션 준비 중…</Text>
      </SafeAreaView>
    );
  }

  return <CallRoom sessionId={sessionId} payload={payload} />;
}

function CallRoom({
  sessionId,
  payload,
}: {
  sessionId: string;
  payload: HydrateSessionPayload;
}) {
  const router = useRouter();
  const [showTranscript, setShowTranscript] = useState(true);
  const autoStartedRef = useRef(false);
  const transcriptRef = useRef<ScrollView | null>(null);

  const { status, error, messages, muted, elapsed, start, stop, toggleMute } = useVapiCall({
    publicKey: payload.publicKey,
    assistantId: payload.assistantId,
    assistantOverrides: payload.assistantOverrides,
    onCallId: (callId) => {
      patchVapiCallId(sessionId, callId).catch((e) =>
        console.error("[CallRoom] patchVapiCallId failed", e),
      );
    },
    onEnd: () => {
      setTimeout(() => router.replace(`/sessions/${sessionId}`), 800);
    },
  });

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    start();
  }, [start]);

  useEffect(() => {
    transcriptRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const isLive = status === "listening" || status === "speaking";

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🎧</Text>
          <Text style={styles.headerTitle}>Alex</Text>
        </View>
        <Text style={styles.timer}>{isLive ? formatElapsed(elapsed) : "--:--"}</Text>
      </View>

      <View style={styles.centerSection}>
        <View
          style={[
            styles.avatar,
            status === "speaking" && styles.avatarSpeaking,
            status === "listening" && styles.avatarListening,
            status === "error" && styles.avatarError,
          ]}
        >
          <Text style={styles.avatarEmoji}>
            {status === "speaking"
              ? "🗣️"
              : status === "listening"
                ? "👂"
                : status === "error"
                  ? "⚠️"
                  : "⏳"}
          </Text>
        </View>

        <Text style={styles.statusLabel}>{STATUS_LABEL[status]}</Text>

        {error && <Text style={styles.errorInline}>{error}</Text>}

        {status === "error" && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace(`/sessions/${sessionId}`)}
          >
            <Text style={styles.backButtonText}>세션으로 돌아가기</Text>
          </TouchableOpacity>
        )}
      </View>

      {showTranscript && messages.length > 0 && (
        <ScrollView
          ref={transcriptRef}
          style={styles.transcript}
          contentContainerStyle={styles.transcriptContent}
        >
          {messages.map((m, i) => (
            <Text
              key={i}
              style={[
                styles.msg,
                m.role === "assistant" ? styles.msgBot : styles.msgUser,
              ]}
            >
              <Text style={styles.msgRole}>{m.role === "assistant" ? "Alex: " : "You: "}</Text>
              {m.text}
            </Text>
          ))}
        </ScrollView>
      )}

      {isLive && (
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={toggleMute}
            style={[styles.controlBtn, muted && styles.controlBtnMuted]}
          >
            <Ionicons
              name={muted ? "mic-off" : "mic"}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={stop} style={styles.endButton}>
            <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowTranscript((v) => !v)}
            style={styles.controlBtn}
          >
            <Ionicons
              name={showTranscript ? "chatbubble" : "chatbubble-outline"}
              size={26}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a" },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    gap: 12,
  },
  loadingText: { color: "#94a3b8", fontSize: 14 },
  errorRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    padding: 24,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 8 },
  errorText: { fontSize: 14, color: "#cbd5e1", textAlign: "center", marginBottom: 24 },
  errorButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#334155",
  },
  errorButtonText: { color: "#f1f5f9", fontWeight: "600" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerEmoji: { fontSize: 20 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  timer: { color: "#94a3b8", fontSize: 14, fontFamily: "monospace" },
  centerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  avatarSpeaking: { backgroundColor: "#16a34a" },
  avatarListening: { backgroundColor: "#2563eb" },
  avatarError: { backgroundColor: "#dc2626" },
  avatarEmoji: { fontSize: 56 },
  statusLabel: { color: "#e2e8f0", fontSize: 16, fontWeight: "500" },
  errorInline: { color: "#fca5a5", fontSize: 13, marginTop: 12, textAlign: "center" },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#334155",
  },
  backButtonText: { color: "#fff", fontWeight: "600" },
  transcript: { maxHeight: 200, borderTopWidth: 1, borderTopColor: "#1e293b" },
  transcriptContent: { padding: 16, gap: 8 },
  msg: { fontSize: 13, lineHeight: 18 },
  msgRole: { fontWeight: "700" },
  msgBot: { color: "#93c5fd" },
  msgUser: { color: "#e5e7eb" },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnMuted: { backgroundColor: "#eab308" },
  endButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
});
