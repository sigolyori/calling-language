import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ApiError,
  createSchedule,
  deleteSchedule,
  getSchedules,
  updateSchedule,
  type Schedule,
} from "@/lib/api";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]; // Mon=1..Sun=7

function validateTime(hhmm: string): boolean {
  if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(hhmm)) return false;
  return true;
}

export default function SchedulesScreen() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formDays, setFormDays] = useState<number[]>([]);
  const [formTime, setFormTime] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getSchedules();
      setSchedules(data.sort((a, b) => a.timeHHMM.localeCompare(b.timeHHMM)));
    } catch (err) {
      if (!(err instanceof ApiError && err.kind === "unauthorized")) {
        console.warn("[Schedules] load error", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function resetForm() {
    setEditId(null);
    setFormDays([]);
    setFormTime("");
    setShowForm(false);
  }

  function openCreate() {
    setEditId(null);
    setFormDays([1, 2, 3, 4, 5]);
    setFormTime("09:00");
    setShowForm(true);
  }

  function openEdit(s: Schedule) {
    setEditId(s.id);
    setFormDays(s.daysOfWeek);
    setFormTime(s.timeHHMM);
    setShowForm(true);
  }

  function toggleDay(d: number) {
    setFormDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  }

  async function handleSave() {
    if (formDays.length === 0) {
      Alert.alert("요일 선택", "하나 이상의 요일을 선택해주세요");
      return;
    }
    if (!validateTime(formTime)) {
      Alert.alert("시간 형식 오류", "HH:MM 형식으로 입력해주세요 (예: 09:30)");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateSchedule(editId, { daysOfWeek: formDays, timeHHMM: formTime });
      } else {
        await createSchedule({ daysOfWeek: formDays, timeHHMM: formTime });
      }
      await load();
      resetForm();
    } catch (err) {
      Alert.alert("저장 실패", err instanceof ApiError ? err.message : "알 수 없는 오류");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(s: Schedule) {
    try {
      await updateSchedule(s.id, { isActive: !s.isActive });
      await load();
    } catch (err) {
      Alert.alert("변경 실패", err instanceof ApiError ? err.message : "알 수 없는 오류");
    }
  }

  function handleDelete(s: Schedule) {
    Alert.alert("스케줄 삭제", "이 스케줄을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSchedule(s.id);
            await load();
          } catch (err) {
            Alert.alert("삭제 실패", err instanceof ApiError ? err.message : "");
          }
        },
      },
    ]);
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
      <FlatList
        data={schedules}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {showForm ? (
              <View style={styles.form}>
                <Text style={styles.formTitle}>
                  {editId ? "스케줄 수정" : "새 스케줄"}
                </Text>
                <Text style={styles.formLabel}>요일</Text>
                <View style={styles.dayRow}>
                  {DAY_LABELS.map((label, i) => {
                    const d = i + 1;
                    const active = formDays.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                        onPress={() => toggleDay(d)}
                      >
                        <Text style={[styles.dayText, active && styles.dayTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.formLabel}>시간 (24시간 형식)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={formTime}
                  onChangeText={setFormTime}
                  placeholder="09:30"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <View style={styles.formButtons}>
                  <TouchableOpacity style={[styles.secondary]} onPress={resetForm}>
                    <Text style={styles.secondaryText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primary, saving && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryText}>저장</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={openCreate}>
                <Ionicons name="add" size={20} color="#16a34a" />
                <Text style={styles.addButtonText}>스케줄 추가</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTime}>{item.timeHHMM}</Text>
              <Switch
                value={item.isActive}
                onValueChange={() => handleToggleActive(item)}
                trackColor={{ false: "#d1d5db", true: "#86efac" }}
                thumbColor={item.isActive ? "#16a34a" : "#f3f4f6"}
              />
            </View>
            <View style={styles.cardDays}>
              {DAY_LABELS.map((label, i) => {
                const d = i + 1;
                const active = item.daysOfWeek.includes(d);
                return (
                  <View
                    key={d}
                    style={[styles.dayPill, active && styles.dayPillActive]}
                  >
                    <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.cardAction} onPress={() => openEdit(item)}>
                <Ionicons name="pencil" size={16} color="#2563eb" />
                <Text style={styles.cardActionText}>편집</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardAction} onPress={() => handleDelete(item)}>
                <Ionicons name="trash" size={16} color="#dc2626" />
                <Text style={[styles.cardActionText, { color: "#dc2626" }]}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>등록된 스케줄이 없습니다</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  centerRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  list: { padding: 16 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#16a34a",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  addButtonText: { color: "#16a34a", fontWeight: "600", fontSize: 15 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 8, marginBottom: 8 },
  dayRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dayChipActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  dayText: { color: "#374151", fontWeight: "500" },
  dayTextActive: { color: "#fff" },
  timeInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontFamily: "monospace",
    textAlign: "center",
    marginBottom: 12,
  },
  formButtons: { flexDirection: "row", gap: 8, marginTop: 4 },
  primary: { flex: 1, backgroundColor: "#16a34a", borderRadius: 8, padding: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  secondary: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 8, padding: 12, alignItems: "center" },
  secondaryText: { color: "#374151", fontWeight: "600", fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTime: { fontSize: 22, fontWeight: "700", fontFamily: "monospace", color: "#111827" },
  cardDays: { flexDirection: "row", gap: 4, marginTop: 10 },
  dayPill: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  dayPillActive: { backgroundColor: "#ecfdf5" },
  dayPillText: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  dayPillTextActive: { color: "#16a34a", fontWeight: "700" },
  cardActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  cardAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardActionText: { fontSize: 13, color: "#2563eb", fontWeight: "500" },
  empty: { alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#6b7280" },
});
