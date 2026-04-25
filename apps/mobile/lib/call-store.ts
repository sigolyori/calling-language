import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "incomingCallMap";

type CallMap = Record<string, string>;

async function readMap(): Promise<CallMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CallMap) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: CallMap): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function setSessionForCall(callUUID: string, sessionId: string): Promise<void> {
  const map = await readMap();
  map[callUUID] = sessionId;
  await writeMap(map);
}

export async function takeSessionForCall(callUUID: string): Promise<string | null> {
  const map = await readMap();
  const sessionId = map[callUUID] ?? null;
  if (sessionId) {
    delete map[callUUID];
    await writeMap(map);
  }
  return sessionId;
}
