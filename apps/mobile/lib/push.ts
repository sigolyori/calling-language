import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ApiError, registerDevice, unregisterDevice } from "./api";

const TOKEN_STORAGE_KEY = "expoPushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("incoming-call", {
    name: "Incoming calls",
    importance: Notifications.AndroidImportance.MAX,
    sound: null,
    vibrationPattern: [0, 250, 250, 250],
    bypassDnd: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("[push] Not running on a real device — skipping push registration");
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== "granted") {
    console.warn("[push] Permission denied");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("[push] Missing EAS projectId in expoConfig");
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResponse.data;

  try {
    await registerDevice({ expoPushToken, platform: Platform.OS as "android" | "ios" });
  } catch (err) {
    if (!(err instanceof ApiError && err.kind === "unauthorized")) {
      console.warn("[push] registerDevice failed", err);
    }
    return null;
  }

  return expoPushToken;
}

export async function unregisterFromPushAsync(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await unregisterDevice(token);
  } catch (err) {
    console.warn("[push] unregisterDevice failed", err);
  }
}

export { TOKEN_STORAGE_KEY };
