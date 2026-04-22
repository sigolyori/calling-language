import type { LearnerProfileJson } from "../profiles";
import type { DailyBriefingJson } from "../briefings";
import { ALEX_BASE, ALEX_MODEL, ALEX_MODEL_PROVIDER } from "./alex-base";

function renderMemorySection(profile: LearnerProfileJson): string {
  const { learner_profile: core, speaking_patterns: sp, session_history, open_threads, excluded_topics } = profile;

  const recentSessions = session_history.length
    ? session_history
        .slice(-5)
        .map((s) => {
          const topics = s.topics_discussed.length ? s.topics_discussed.join(", ") : "—";
          const hooks = s.follow_up_hooks.length ? ` | follow-ups: ${s.follow_up_hooks.join("; ")}` : "";
          return `  - ${s.date} (${s.duration_min}min): ${topics}${hooks}`;
        })
        .join("\n")
    : "  (no prior sessions)";

  const openThreadsText = open_threads.length
    ? open_threads.map((t) => `  - ${t}`).join("\n")
    : "  (none)";

  const excludedText = excluded_topics.length
    ? excluded_topics.map((t) => `  - ${t}`).join("\n")
    : "  (none)";

  const lines = [
    "=== LEARNER MEMORY ===",
    `Name: ${core.name || "(unknown)"}`,
    `Level: ${core.level}${core.english_level_notes ? ` — ${core.english_level_notes}` : ""}`,
    core.occupation ? `Occupation: ${core.occupation}` : null,
    core.location ? `Location: ${core.location}` : null,
    core.interests.length ? `Interests: ${core.interests.join(", ")}` : null,
    core.recurring_topics.length ? `Recurring topics: ${core.recurring_topics.join(", ")}` : null,
    core.language_goals ? `Language goals: ${core.language_goals}` : null,
    "",
    "Speaking patterns:",
    sp.strengths.length ? `  Strengths: ${sp.strengths.join(", ")}` : "  Strengths: (none noted yet)",
    sp.common_errors.length ? `  Common errors: ${sp.common_errors.join(", ")}` : null,
    sp.improvement_areas.length ? `  Work on: ${sp.improvement_areas.join(", ")}` : null,
    sp.filler_words.length ? `  Filler words: ${sp.filler_words.join(", ")}` : null,
    "",
    "Recent sessions:",
    recentSessions,
    "",
    "Open threads (follow up if natural):",
    openThreadsText,
    "",
    "Topics to avoid (learner asked):",
    excludedText,
  ].filter((l): l is string => l !== null);

  return lines.join("\n");
}

function renderBriefingSection(briefing: DailyBriefingJson, kstDate: string): string {
  const items = briefing.items
    .map((it) => `  [${it.category}] ${it.headline}\n    ${it.context}\n    why relevant: ${it.why_relevant}`)
    .join("\n");
  const starters = briefing.conversation_starters.length
    ? briefing.conversation_starters.map((s) => `  - ${s}`).join("\n")
    : "  (none)";
  return [
    `=== TODAY'S NEWS BRIEFING (${kstDate}, Seoul) ===`,
    `Weather: ${briefing.weather_seoul}`,
    "",
    "Items:",
    items,
    "",
    "Conversation starters you can use:",
    starters,
    "",
    "Use these naturally — don't recite them. Mention at most one news item per call unless the learner engages.",
  ].join("\n");
}

export function buildSystemPrompt(args: {
  profile: LearnerProfileJson | null;
  briefing: DailyBriefingJson | null;
  kstDate: string;
}): string | null {
  const parts: string[] = [];
  if (ALEX_BASE.trim()) parts.push(ALEX_BASE.trim());
  if (args.profile) parts.push(renderMemorySection(args.profile));
  if (args.briefing) parts.push(renderBriefingSection(args.briefing, args.kstDate));

  if (parts.length === 0) return null;
  return parts.join("\n\n");
}

export function buildFirstMessage(profile: LearnerProfileJson | null): string {
  const name = profile?.learner_profile.name?.trim();
  const thread = profile?.open_threads?.[0]?.trim();

  if (thread) {
    const greeting = name ? `Hi ${name}!` : "Hi!";
    return `${greeting} It's Alex. Last time we left off on ${thread} — I've been curious how that's been going. Want to pick up there?`;
  }
  if (name) {
    return `Hi ${name}! It's Alex — how's your day been so far?`;
  }
  return "Hi there! This is Alex, your English conversation coach. It's great to connect — how's your day going so far?";
}

export interface AssistantOverrides {
  metadata?: Record<string, unknown>;
  model?: {
    provider: string;
    model: string;
    messages: { role: "system"; content: string }[];
  };
  firstMessage?: string;
}

export function buildAssistantOverrides(args: {
  sessionId: string;
  profile: LearnerProfileJson | null;
  briefing: DailyBriefingJson | null;
  kstDate: string;
}): AssistantOverrides {
  const systemPrompt = buildSystemPrompt({
    profile: args.profile,
    briefing: args.briefing,
    kstDate: args.kstDate,
  });

  const overrides: AssistantOverrides = {
    metadata: { sessionId: args.sessionId },
    firstMessage: buildFirstMessage(args.profile),
  };

  if (systemPrompt) {
    overrides.model = {
      provider: ALEX_MODEL_PROVIDER,
      model: ALEX_MODEL,
      messages: [{ role: "system", content: systemPrompt }],
    };
  }

  return overrides;
}
