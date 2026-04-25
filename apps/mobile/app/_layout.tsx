import "@/lib/fcm-background"; // side-effect: registers FCM background handler

import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { setupCallKeep } from "@/lib/callkeep";
import { registerForPushAsync } from "@/lib/push";

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/login");
    else if (user && inAuth) router.replace("/(tabs)");
  }, [loading, user, segments, router]);

  // After login: register push token + bootstrap CallKeep (Android only).
  useEffect(() => {
    if (!user) return;
    setupCallKeep().catch((e) => console.warn("[layout] setupCallKeep", e));
    registerForPushAsync().catch((e) =>
      console.warn("[layout] registerForPushAsync", e),
    );
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sessions/[id]" options={{ headerShown: true, title: "세션 상세" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AuthGate />
    </AuthProvider>
  );
}
