import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://calling-language-web.vercel.app";

export class ApiError extends Error {
  constructor(
    public kind: "network" | "http" | "unauthorized",
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError("network", 0, `네트워크 연결을 확인해주세요 (${msg})`);
  }

  if (res.status === 401) {
    await clearToken();
    throw new ApiError("unauthorized", 401, "로그인이 만료되었습니다");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const message = (body as { error?: string }).error ?? "요청 실패";
    throw new ApiError("http", res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Auth ---
export interface AuthResponse {
  token: string;
  user: User;
}

export async function signup(data: {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  englishLevel: "beginner" | "intermediate";
  timezone: string;
}): Promise<AuthResponse> {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify(data) });
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify(data) });
}

// --- User ---
export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  englishLevel: string;
  timezone: string;
  createdAt: string;
}

export async function getMe(): Promise<User> {
  return request("/api/users/me");
}

export async function updateMe(
  data: Partial<Pick<User, "name" | "phoneNumber" | "timezone">>,
): Promise<User> {
  return request("/api/users/me", { method: "PATCH", body: JSON.stringify(data) });
}

// --- Schedules ---
export interface Schedule {
  id: string;
  userId: string;
  daysOfWeek: number[];
  timeHHMM: string;
  isActive: boolean;
  createdAt: string;
}

export async function getSchedules(): Promise<Schedule[]> {
  return request("/api/schedules");
}

export async function createSchedule(data: {
  daysOfWeek: number[];
  timeHHMM: string;
}): Promise<Schedule> {
  return request("/api/schedules", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSchedule(
  id: string,
  data: Partial<{ daysOfWeek: number[]; timeHHMM: string; isActive: boolean }>,
): Promise<Schedule> {
  return request(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteSchedule(id: string): Promise<void> {
  return request(`/api/schedules/${id}`, { method: "DELETE" });
}

// --- Sessions ---
export type OpicLevel =
  | "NL" | "NM" | "NH"
  | "IL" | "IM1" | "IM2" | "IM3" | "IH"
  | "AL" | "AM" | "AH" | "Superior";

export type CallType = "pstn" | "webrtc";

export interface SessionSummary {
  id: string;
  status: string;
  callType?: CallType;
  startedAt: string | null;
  endedAt: string | null;
  durationSecs: number | null;
  createdAt: string;
  feedback: { opicLevel: OpicLevel; overallSummary: string } | null;
}

export type FeedbackStatus =
  | "success" | "pending" | "failed" | "too_short" | "no_api_key" | null;

export interface SessionDetail extends SessionSummary {
  feedback: Feedback | null;
  transcript: { id: string; createdAt: string } | null;
  feedbackStatus: FeedbackStatus;
  feedbackError: string | null;
}

export interface Feedback {
  id: string;
  opicLevel: OpicLevel;
  opicRationale: string;
  strengths: string;
  improvements: string;
  specificExamples: { original: string; corrected: string; note: string }[];
  overallSummary: string;
  createdAt: string;
}

export interface TranscriptMessage {
  role: "assistant" | "user";
  text: string;
  timestamp: number;
}

export interface TranscriptData {
  id: string;
  sessionId: string;
  content: TranscriptMessage[];
  rawText: string;
  createdAt: string;
}

export async function getSessions(
  page = 1,
  limit = 10,
): Promise<{ sessions: SessionSummary[]; total: number; page: number; limit: number }> {
  return request(`/api/sessions?page=${page}&limit=${limit}`);
}

export async function getSession(id: string): Promise<SessionDetail> {
  return request(`/api/sessions/${id}`);
}

export async function getTranscript(sessionId: string): Promise<TranscriptData> {
  return request(`/api/sessions/${sessionId}/transcript`);
}

export async function retryFeedback(
  sessionId: string,
): Promise<{ ok: boolean; feedback: Feedback | null; feedbackError: string | null; error?: string }> {
  return request(`/api/sessions/${sessionId}/feedback`, { method: "POST" });
}

// --- Calls ---
export interface WebrtcCallPayload {
  ok: true;
  sessionId: string;
  assistantId: string;
  assistantOverrides: Record<string, unknown>;
  publicKey: string;
}

export async function triggerWebrtcCall(): Promise<WebrtcCallPayload> {
  return request("/api/calls/trigger/webrtc", { method: "POST" });
}

export interface HydrateSessionPayload {
  ok: true;
  assistantId: string;
  assistantOverrides: Record<string, unknown>;
  publicKey: string;
}

export async function hydrateSession(sessionId: string): Promise<HydrateSessionPayload> {
  return request(`/api/calls/session/${sessionId}/start`, { method: "POST" });
}

export async function patchVapiCallId(
  sessionId: string,
  vapiCallId: string,
): Promise<{ ok: true }> {
  return request(`/api/calls/${sessionId}/vapi-id`, {
    method: "PATCH",
    body: JSON.stringify({ vapiCallId }),
  });
}

// --- Devices (push tokens) ---
export async function registerDevice(data: {
  expoPushToken: string;
  platform: "android" | "ios";
}): Promise<{ ok: true; id: string }> {
  return request("/api/devices/register", { method: "POST", body: JSON.stringify(data) });
}

export async function unregisterDevice(expoPushToken: string): Promise<void> {
  return request(`/api/devices/${encodeURIComponent(expoPushToken)}`, { method: "DELETE" });
}
