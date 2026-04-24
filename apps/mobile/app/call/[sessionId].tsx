import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CallScreen() {
  const router = useRouter();
  const { sessionId, mode } = useLocalSearchParams<{ sessionId: string; mode?: string }>();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={styles.title}>Vapi RN SDK — 준비 중</Text>
        <Text style={styles.subtitle}>
          Expo Go에서는 네이티브 모듈이 작동하지 않습니다.{"\n"}
          EAS Dev Client 빌드(Phase C) 이후 이 화면에서 Alex와 실제 통화가 연결됩니다.
        </Text>

        <View style={styles.info}>
          <Text style={styles.infoLabel}>세션 ID</Text>
          <Text style={styles.infoValue}>{sessionId}</Text>
          <Text style={styles.infoLabel}>진입 경로</Text>
          <Text style={styles.infoValue}>{mode ?? "user"}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a" },
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 12 },
  subtitle: {
    fontSize: 14,
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  info: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: { fontSize: 13, color: "#e2e8f0", marginBottom: 12, fontFamily: "monospace" },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#334155",
  },
  buttonText: { color: "#f1f5f9", fontSize: 15, fontWeight: "600" },
});
