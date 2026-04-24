import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SessionCard } from "@/components/SessionCard";
import {
  ApiError,
  getSessions,
  triggerWebrtcCall,
  type SessionSummary,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DashboardScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calling, setCalling] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getSessions(1, 20);
      setSessions(data.sessions);
      setTotal(data.total);
    } catch (err) {
      if (!(err instanceof ApiError && err.kind === "unauthorized")) {
        console.warn("[Dashboard] load error", err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleStartCall() {
    setCalling(true);
    try {
      const payload = await triggerWebrtcCall();
      router.push({
        pathname: "/call/[sessionId]",
        params: { sessionId: payload.sessionId, mode: "user" },
      });
    } catch (err) {
      Alert.alert(
        "통화 시작 실패",
        err instanceof ApiError ? err.message : "알 수 없는 오류",
      );
    } finally {
      setCalling(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centerRoot}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요,</Text>
          <Text style={styles.name}>{user?.name ?? "-"}님</Text>
        </View>
        <TouchableOpacity onPress={signOut} hitSlop={8}>
          <Ionicons name="log-out-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>지금 바로 연습하기</Text>
        <Text style={styles.ctaSubtitle}>
          브라우저 통화로 Alex와 바로 대화를 시작하세요
        </Text>
        <TouchableOpacity
          style={[styles.button, calling && styles.buttonDisabled]}
          onPress={handleStartCall}
          disabled={calling}
        >
          {calling ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🎧 통화 시작</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>세션 기록</Text>
        <Text style={styles.listCount}>{total}개</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <SessionCard session={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🤖</Text>
            <Text style={styles.emptyText}>아직 통화 기록이 없습니다</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  centerRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontSize: 14, color: "#6b7280" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827" },
  cta: {
    margin: 16,
    padding: 20,
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  ctaTitle: { fontSize: 16, fontWeight: "700", color: "#065f46", marginBottom: 4 },
  ctaSubtitle: { fontSize: 13, color: "#047857", marginBottom: 12 },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  listCount: { fontSize: 13, color: "#9ca3af" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#6b7280" },
});
