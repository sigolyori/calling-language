// Module top-level side-effect: registers FCM background message handler.
// Imported once from app/_layout.tsx so it runs before any message arrives.

import "react-native-get-random-values";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import RNCallKeep from "react-native-callkeep";
import { setSessionForCall } from "./call-store";

function generateUUID(): string {
  type Crypto = { randomUUID?: () => string };
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
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

    const callUUID = generateUUID();
    await setSessionForCall(callUUID, sessionId);

    try {
      RNCallKeep.displayIncomingCall(
        callUUID,
        "Alex",
        "Alex (English Coach)",
        "generic",
        false,
      );
    } catch (err) {
      console.warn("[fcm-bg] displayIncomingCall failed", err);
    }
  });
}
