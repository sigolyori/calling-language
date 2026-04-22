import { z } from "zod";
import { prisma } from "./prisma";
import { getAnthropic, HAIKU_MODEL, stripJsonFences } from "./anthropic";
import { PROFILE_EXTRACTOR_SYSTEM, buildProfileExtractorUserPrompt } from "./prompts/profile-extractor";

export interface LearnerProfileCore {
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  english_level_notes: string;
  occupation: string;
  location: string;
  interests: string[];
  recurring_topics: string[];
  language_goals: string;
}

export interface SpeakingPatterns {
  common_errors: string[];
  improvement_areas: string[];
  strengths: string[];
  filler_words: string[];
}

export interface SessionEntry {
  date: string;
  duration_min: number;
  topics_discussed: string[];
  key_moments: string[];
  follow_up_hooks: string[];
  corrections_given: string[];
}

export interface LearnerProfileJson {
  learner_profile: LearnerProfileCore;
  speaking_patterns: SpeakingPatterns;
  session_history: SessionEntry[];
  open_threads: string[];
  excluded_topics: string[];
}

const sessionEntrySchema = z.object({
  date: z.string(),
  duration_min: z.number(),
  topics_discussed: z.array(z.string()),
  key_moments: z.array(z.string()),
  follow_up_hooks: z.array(z.string()),
  corrections_given: z.array(z.string()),
});

const learnerProfileJsonSchema = z.object({
  learner_profile: z.object({
    name: z.string(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    english_level_notes: z.string(),
    occupation: z.string(),
    location: z.string(),
    interests: z.array(z.string()),
    recurring_topics: z.array(z.string()),
    language_goals: z.string(),
  }),
  speaking_patterns: z.object({
    common_errors: z.array(z.string()),
    improvement_areas: z.array(z.string()),
    strengths: z.array(z.string()),
    filler_words: z.array(z.string()),
  }),
  session_history: z.array(sessionEntrySchema),
  open_threads: z.array(z.string()),
  excluded_topics: z.array(z.string()),
});

const MAX_SESSIONS = 10;
const MAX_OPEN_THREADS = 5;

function applyCaps(p: LearnerProfileJson): LearnerProfileJson {
  return {
    ...p,
    session_history: p.session_history.slice(-MAX_SESSIONS),
    open_threads: p.open_threads.slice(-MAX_OPEN_THREADS),
  };
}

export async function loadProfile(userId: string): Promise<LearnerProfileJson | null> {
  const row = await prisma.learnerProfile.findUnique({ where: { userId } });
  if (!row) return null;
  return {
    learner_profile: row.learnerProfile as unknown as LearnerProfileCore,
    speaking_patterns: row.speakingPatterns as unknown as SpeakingPatterns,
    session_history: row.sessionHistory as unknown as SessionEntry[],
    open_threads: row.openThreads as unknown as string[],
    excluded_topics: row.excludedTopics as unknown as string[],
  };
}

export async function upsertProfile(userId: string, profile: LearnerProfileJson): Promise<void> {
  const capped = applyCaps(profile);
  await prisma.learnerProfile.upsert({
    where: { userId },
    create: {
      userId,
      learnerProfile: capped.learner_profile as object,
      speakingPatterns: capped.speaking_patterns as object,
      sessionHistory: capped.session_history as object,
      openThreads: capped.open_threads as object,
      excludedTopics: capped.excluded_topics as object,
    },
    update: {
      learnerProfile: capped.learner_profile as object,
      speakingPatterns: capped.speaking_patterns as object,
      sessionHistory: capped.session_history as object,
      openThreads: capped.open_threads as object,
      excludedTopics: capped.excluded_topics as object,
    },
  });
}

export async function extractAndUpsertProfile(sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { transcript: true, user: true },
  });
  if (!session?.transcript) return;

  const rawText = session.transcript.rawText;
  const words = rawText.trim().split(/\s+/).filter(Boolean).length;
  if (words < 30) {
    console.log(`[Profile] Too short (${words} words), skipping ${sessionId}`);
    return;
  }

  const client = getAnthropic();
  if (!client) {
    console.log(`[Profile STUB] No ANTHROPIC_API_KEY — skipping ${sessionId}`);
    return;
  }

  const prev = await loadProfile(session.userId);
  const durationMin = Math.round((session.durationSecs ?? 0) / 60);
  const sessionDate = (session.startedAt ?? session.createdAt).toISOString().slice(0, 10);

  const userPrompt = buildProfileExtractorUserPrompt({
    prevProfile: prev,
    userName: session.user.name,
    selfReportedLevel: session.user.englishLevel,
    sessionDate,
    sessionDurationMin: durationMin,
    rawTranscript: rawText,
  });

  const msg = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 2048,
    system: PROFILE_EXTRACTOR_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  console.log(
    `[Profile tokens] session=${sessionId} input=${msg.usage.input_tokens} output=${msg.usage.output_tokens}`,
  );

  const content = msg.content[0];
  if (content.type !== "text") throw new Error("[Profile] Unexpected response type");

  const cleaned = stripJsonFences(content.text);
  const parsed = learnerProfileJsonSchema.parse(JSON.parse(cleaned));
  await upsertProfile(session.userId, parsed);
  console.log(`[Profile] Updated for user ${session.userId} via session ${sessionId}`);
}
