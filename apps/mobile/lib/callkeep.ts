import { router } from "expo-router";
import { Platform } from "react-native";
import RNCallKeep from "react-native-callkeep";
import { takeSessionForCall } from "./call-store";

let setupDone = false;
let listenersAttached = false;

// Maps the answered CallKeep callUUID to its sessionId so the in-call
// screen can RNCallKeep.endCall(uuid) when Vapi terminates.
const answeredCalls = new Map<string, string>();

export function endCallKeepForSession(sessionId: string): void {
  for (const [uuid, sid] of answeredCalls.entries()) {
    if (sid === sessionId) {
      try {
        RNCallKeep.endCall(uuid);
      } catch (err) {
        console.warn("[callkeep] endCall failed", err);
      }
      answeredCalls.delete(uuid);
      return;
    }
  }
}

export async function setupCallKeep(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (setupDone) return;
  setupDone = true;

  try {
    await RNCallKeep.setup({
      android: {
        alertTitle: "전화 권한 필요",
        alertDescription: "Alex의 전화를 받으려면 권한을 허용해주세요",
        cancelButton: "취소",
        okButton: "허용",
        additionalPermissions: [],
        selfManaged: false,
      },
      ios: {
        appName: "AI English Coach",
      },
    });
  } catch (err) {
    console.warn("[callkeep] setup failed", err);
    setupDone = false;
    return;
  }

  attachListeners();
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  RNCallKeep.addEventListener("answerCall", async ({ callUUID }) => {
    const sessionId = await takeSessionForCall(callUUID);
    if (!sessionId) {
      console.warn("[callkeep] answerCall: no sessionId for", callUUID);
      RNCallKeep.endCall(callUUID);
      return;
    }
    // Mark CallKeep as "active" so Android keeps the call alive in the
    // background telecom service while our /call screen runs Vapi.
    // Calling endCall here would tear down the entire stack and Android
    // perceives it as a hang-up.
    answeredCalls.set(callUUID, sessionId);
    try {
      RNCallKeep.setCurrentCallActive(callUUID);
    } catch (err) {
      console.warn("[callkeep] setCurrentCallActive failed", err);
    }
    router.replace({
      pathname: "/call/[sessionId]",
      params: { sessionId, mode: "push" },
    });
  });

  RNCallKeep.addEventListener("endCall", async ({ callUUID }) => {
    answeredCalls.delete(callUUID);
    await takeSessionForCall(callUUID);
  });

  RNCallKeep.addEventListener(
    "didDisplayIncomingCall",
    ({ error, callUUID, handle, localizedCallerName }) => {
      if (error) {
        console.warn("[callkeep] didDisplayIncomingCall error", error, callUUID);
      } else {
        console.log("[callkeep] displayed", { callUUID, handle, localizedCallerName });
      }
    },
  );
}
