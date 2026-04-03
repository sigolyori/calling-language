import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const feedbackSchema = z.object({
  fluencyScore: z.number().int().min(1).max(5),
  vocabularyScore: z.number().int().min(1).max(5),
  grammarScore: z.number().int().min(1).max(5),
  strengths: z.string(),
  improvements: z.string(),
  specificExamples: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      note: z.string(),
    })
  ),
  overallSummary: z.string(),
});

export type FeedbackData = z.infer<typeof feedbackSchema>;

const SYSTEM_PROMPT = `You are an expert English language coach analyzing a conversation transcript.
Your role is to provide constructive, encouraging feedback to help the student improve.
Always respond with valid JSON matching the specified schema exactly.
Be specific, reference actual examples from the transcript, and keep feedback actionable.`;

function buildUserPrompt(rawText: string, englishLevel: string): string {
  return `Analyze this English speaking practice session transcript for a ${englishLevel} level learner.

TRANSCRIPT:
${rawText}

Provide feedback as a JSON object with exactly these fields:
{
  "fluencyScore": <1-5 integer, 5=native-like flow>,
  "vocabularyScore": <1-5 integer, 5=rich varied vocabulary>,
  "grammarScore": <1-5 integer, 5=no errors>,
  "strengths": "<2-3 specific things the learner did well>",
  "improvements": "<2-3 specific areas to work on with actionable tips>",
  "specificExamples": [
    {
      "original": "<exact phrase the learner said>",
      "corrected": "<improved version>",
      "note": "<brief explanation of the correction>"
    }
  ],
  "overallSummary": "<1-2 encouraging sentences summarizing the session and key takeaway>"
}

Include 2-4 specific examples in specificExamples. Respond with JSON only, no markdown.`;
}

export async function generateFeedback(sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { transcript: true, user: true },
  });

  if (!session?.transcript) {
    console.warn(`[Feedback] No transcript for session ${sessionId}`);
    return;
  }

  // Skip very short sessions (likely unanswered calls)
  const wordCount = session.transcript.rawText.split(/\s+/).length;
  if (wordCount < 30) {
    console.log(`[Feedback] Transcript too short (${wordCount} words), skipping feedback for session ${sessionId}`);
    return;
  }

  if (!env.ANTHROPIC_API_KEY) {
    console.log(`[Feedback STUB] Would generate feedback for session ${sessionId}`);
    await prisma.feedback.create({
      data: {
        sessionId,
        userId: session.userId,
        fluencyScore: 3,
        vocabularyScore: 3,
        grammarScore: 3,
        strengths: "Good attempt at conversation (stub feedback)",
        improvements: "Keep practicing regularly",
        specificExamples: [],
        overallSummary: "This is stub feedback generated in development mode.",
      },
    });
    return;
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(session.transcript.rawText, session.user.englishLevel),
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const parsed = feedbackSchema.parse(JSON.parse(content.text));

  await prisma.feedback.create({
    data: {
      sessionId,
      userId: session.userId,
      ...parsed,
    },
  });

  console.log(`[Feedback] Generated feedback for session ${sessionId}`);
}
