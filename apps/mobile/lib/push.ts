import messaging from "@react-native-firebase/messaging";
import * as Device from "expo-device";
import { PermissionsAndroid, Platform } from "react-native";
import { ApiError, registerDevice, unregisterDevice } from "./api";

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      // POST_NOTIFICATIONS exists at runtime but not in older PermissionsAndroid types
      "android.permission.POST_NOTIFICATIONS" as never,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.warn("[push] POST_NOTIFICATIONS denied");
      return false;
    }
  }
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  return enabled;
}

export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("[push] Not on a real device — skipping push registration");
    return null;
  }

  const ok = await ensureNotificationPermission();
  if (!ok) return null;

  let fcmToken: string;
  try {
    fcmToken = await messaging().getToken();
  } catch (err) {
    console.warn("[push] getToken failed", err);
    return null;
  }
  console.log("[push] FCM token", fcmToken.slice(0, 16) + "…");

  try {
    await registerDevice({ fcmToken, platform: Platform.OS as "android" | "ios" });
  } catch (err) {
    if (!(err instanceof ApiError && err.kind === "unauthorized")) {
      console.warn("[push] registerDevice failed", err);
    }
    return null;
  }

  return fcmToken;
}

export async function unregisterFromPushAsync(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await unregisterDevice(token);
  } catch (err) {
    console.warn("[push] unregisterDevice failed", err);
  }
}
