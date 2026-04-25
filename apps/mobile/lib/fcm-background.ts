// Module top-level side-effect: registers FCM background handler that
// shows a heads-up + full-screen-intent notification via notifee. Imported
// once from app/_layout.tsx so the handler is registered before any
// message arrives, even when the app is killed.

import messaging from "@react-native-firebase/messaging";
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from "@notifee/react-native";
import { Platform } from "react-native";

export const INCOMING_CALL_CHANNEL_ID = "incoming-call";

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: INCOMING_CALL_CHANNEL_ID,
    name: "Incoming calls",
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: "default",
  });
}

if (Platform.OS === "android") {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    const data = remoteMessage?.data ?? {};
    if (data.type !== "incoming_call") return;
    const sessionId = typeof data.sessionId === "string" ? data.sessionId : null;
    if (!sessionId) {
      console.warn("[fcm-bg] incoming_call without sessionId");
      return;
    }

    await ensureChannel();
    await notifee.displayNotification({
      id: sessionId,
      title: "Alex (English Coach)",
      body: "영어 회화 통화 — 받기를 누르세요",
      data: { sessionId, type: "incoming_call" },
      android: {
        channelId: INCOMING_CALL_CHANNEL_ID,
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        // fullScreenAction wakes the screen and shows our app full-screen
        // even when the device is locked / app is killed.
        fullScreenAction: { id: "incoming-call", launchActivity: "default" },
        pressAction: { id: "incoming-call", launchActivity: "default" },
        ongoing: true,
        autoCancel: false,
        loopSound: true,
        showTimestamp: false,
        actions: [
          { title: "받기", pressAction: { id: "answer", launchActivity: "default" } },
          { title: "거절", pressAction: { id: "decline" } },
        ],
      },
    });
  });
}
