import * as Localization from "expo-localization";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DEFAULT_TZ =
  Localization.getCalendars()[0]?.timeZone ?? "Asia/Seoul";

type Level = "beginner" | "intermediate";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+82");
  const [englishLevel, setEnglishLevel] = useState<Level>("intermediate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email || !password || !name || !phoneNumber) {
      setError("모든 필드를 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      await signUp({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        englishLevel,
        timezone: DEFAULT_TZ,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>🎧 회원가입</Text>

          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호 (8자 이상)"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="이름"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="휴대폰 번호 (예: +821012345678)"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />

          <Text style={styles.label}>영어 레벨</Text>
          <View style={styles.levelRow}>
            {(["beginner", "intermediate"] as Level[]).map((lv) => (
              <TouchableOpacity
                key={lv}
                style={[styles.levelButton, englishLevel === lv && styles.levelActive]}
                onPress={() => setEnglishLevel(lv)}
              >
                <Text
                  style={[
                    styles.levelText,
                    englishLevel === lv && styles.levelTextActive,
                  ]}
                >
                  {lv === "beginner" ? "초급" : "중급"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.hint}>시간대: {DEFAULT_TZ}</Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>가입하기</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
            <Link href="/(auth)/login" style={styles.link}>
              로그인
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8, marginBottom: 8 },
  levelRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  levelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  levelActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  levelText: { color: "#374151", fontSize: 15, fontWeight: "500" },
  levelTextActive: { color: "#fff" },
  hint: { fontSize: 12, color: "#9ca3af", marginBottom: 16, textAlign: "center" },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626", fontSize: 14, marginVertical: 8, textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { color: "#6b7280", fontSize: 14 },
  link: { color: "#16a34a", fontSize: 14, fontWeight: "600" },
});
