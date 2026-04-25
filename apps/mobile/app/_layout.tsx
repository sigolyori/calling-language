import "@/lib/fcm-background"; // side-effect: registers FCM background handler

import notifee, { EventType } from "@notifee/react-native";
import { Stack, router as globalRouter, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { registerForPushAsync } from "@/lib/push";

// Background notification event handler — runs even when app is killed.
// Registered at module load time so it's set up before any FCM payload
// triggers a notification press from the cold-start path.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "decline") {
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
  }
  // PRESS / answer paths re-launch MainActivity via launchActivity:'default'.
  // The actual /call navigation happens in foreground after Activity start
  // — see getInitialNotification handling below.
});

function navigateToCall(sessionId: unknown) {
  if (typeof sessionId !== "string" || !sessionId) return;
  globalRouter.replace({
    pathname: "/call/[sessionId]",
    params: { sessionId, mode: "push" },
  });
}

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

  // Notification permission after login (Android 13+ POST_NOTIFICATIONS).
  useEffect(() => {
    if (!user) return;
    registerForPushAsync().catch((e) =>
      console.warn("[layout] registerForPushAsync", e),
    );
  }, [user]);

  // Cold-start: app launched by tapping the incoming-call notification.
  useEffect(() => {
    if (!user) return;
    notifee
      .getInitialNotification()
      .then((initial) => {
        if (!initial) return;
        const data = initial.notification.data ?? {};
        if (data.type === "incoming_call") {
          navigateToCall(data.sessionId);
        }
      })
      .catch((e) => console.warn("[layout] getInitialNotification", e));
  }, [user]);

  // Foreground / background-but-running: app is open and notification is
  // tapped. Route to /call when user presses notification or "answer".
  useEffect(() => {
    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) return;
      const data = detail.notification?.data ?? {};
      if (data.type !== "incoming_call") return;
      const action = detail.pressAction?.id;
      if (action === "decline") {
        if (detail.notification?.id) {
          notifee.cancelNotification(detail.notification.id).catch(() => {});
        }
        return;
      }
      navigateToCall(data.sessionId);
    });
    return unsub;
  }, []);

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
