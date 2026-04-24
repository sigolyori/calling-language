function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
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
  return request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  return request("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

export async function updateMe(data: Partial<Pick<User, "name" | "phoneNumber" | "timezone">>): Promise<User> {
  return request("/api/users/me", { method: "PATCH", body: JSON.stringify(data) });
}

// --- Learner profile (cross-call memory) ---
export interface LearnerProfileResponse {
  profile: {
    learner_profile: {
      name: string;
      level: "beginner" | "intermediate" | "advanced";
      english_level_notes: string;
      occupation: string;
      location: string;
      interests: string[];
      recurring_topics: string[];
      language_goals: string;
    };
    speaking_patterns: {
      common_errors: string[];
      improvement_areas: string[];
      strengths: string[];
      filler_words: string[];
    };
    session_history: {
      date: string;
      duration_min: number;
      topics_discussed: string[];
      key_moments: string[];
      follow_up_hooks: string[];
      corrections_given: string[];
    }[];
    open_threads: string[];
    excluded_topics: string[];
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function getMyProfile(): Promise<LearnerProfileResponse> {
  return request("/api/users/me/profile");
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
  return request("/api/schedules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSchedule(
  id: string,
  data: Partial<{ daysOfWeek: number[]; timeHHMM: string; isActive: boolean }>
): Promise<Schedule> {
  return request(`/api/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  return request(`/api/schedules/${id}`, { method: "DELETE" });
}

// --- Sessions ---
export type OpicLevel =
  | "NL"
  | "NM"
  | "NH"
  | "IL"
  | "IM1"
  | "IM2"
  | "IM3"
  | "IH"
  | "AL"
  | "AM"
  | "AH"
  | "Superior";

export type CallType = "pstn" | "webrtc";

export interface SessionSummary {
  id: string;
  status: string;
  callType?: CallType;
  startedAt: string | null;
  endedAt: string | null;
  durationSecs: number | null;
  createdAt: string;
  feedback: {
    opicLevel: OpicLevel;
    overallSummary: string;
  } | null;
}

export type FeedbackStatus =
  | "success"
  | "pending"
  | "failed"
  | "too_short"
  | "no_api_key"
  | null;

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
  limit = 10
): Promise<{ sessions: SessionSummary[]; total: number; page: number; limit: number }> {
  return request(`/api/sessions?page=${page}&limit=${limit}`);
}

export async function getSession(id: string): Promise<SessionDetail> {
  return request(`/api/sessions/${id}`);
}

export async function getTranscript(sessionId: string): Promise<TranscriptData> {
  return request(`/api/sessions/${sessionId}/transcript`);
}

export async function getFeedback(sessionId: string): Promise<Feedback> {
  return request(`/api/sessions/${sessionId}/feedback`);
}

export async function retryFeedback(
  sessionId: string,
): Promise<{ ok: boolean; feedback: Feedback | null; feedbackError: string | null; error?: string }> {
  return request(`/api/sessions/${sessionId}/feedback`, { method: "POST" });
}

// --- Calls ---
export async function triggerPstnCall(scheduleId?: string): Promise<{
  ok: true;
  sessionId: string;
  vapiCallId: string;
  callingNumber: string;
}> {
  return request("/api/calls/trigger/pstn", {
    method: "POST",
    body: JSON.stringify(scheduleId ? { scheduleId } : {}),
  });
}

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

export async function patchVapiCallId(sessionId: string, vapiCallId: string): Promise<{ ok: true }> {
  return request(`/api/calls/${sessionId}/vapi-id`, {
    method: "PATCH",
    body: JSON.stringify({ vapiCallId }),
  });
}
