import { z } from "zod";
import { prisma } from "./prisma";
import { getAnthropic, SONNET_MODEL } from "./anthropic";

const feedbackSchema = z.object({
  fluencyScore: z.number().int().min(1).max(5),
  vocabularyScore: z.number().int().min(1).max(5),
  grammarScore: z.number().int().min(1).max(5),
  strengths: z.string(),
  improvements: z.string(),
  specificExamples: z.array(z.object({ original: z.string(), corrected: z.string(), note: z.string() })),
  overallSummary: z.string(),
});

const SYSTEM = `You are an expert English language coach analyzing a conversation transcript.
Provide constructive, encouraging feedback. Always respond with valid JSON matching the specified schema exactly.
Be specific, reference actual examples from the transcript, and keep feedback actionable.`;

function buildPrompt(rawText: string, level: string) {
  return `Analyze this English speaking session for a ${level} learner.

TRANSCRIPT:
${rawText}

Respond as JSON:
{"fluencyScore":<1-5>,"vocabularyScore":<1-5>,"grammarScore":<1-5>,"strengths":"...","improvements":"...","specificExamples":[{"original":"...","corrected":"...","note":"..."}],"overallSummary":"..."}

Include 2-4 specificExamples. JSON only, no markdown.`;
}

export async function generateFeedback(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { transcript: true, user: true },
  });
  if (!session?.transcript) return;

  const words = session.transcript.rawText.split(/\s+/).length;
  if (words < 30) {
    console.log(`[Feedback] Too short (${words} words), skipping ${sessionId}`);
    return;
  }

  const client = getAnthropic();
  if (!client) {
    console.log(`[Feedback STUB] session ${sessionId}`);
    await prisma.feedback.create({
      data: {
        sessionId, userId: session.userId,
        fluencyScore: 3, vocabularyScore: 3, grammarScore: 3,
        strengths: "Good attempt (stub)", improvements: "Keep practicing",
        specificExamples: [], overallSummary: "Stub feedback — no API key configured.",
      },
    });
    return;
  }

  const msg = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(session.transcript.rawText, session.user.englishLevel) }],
  });

  const content = msg.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const parsed = feedbackSchema.parse(JSON.parse(content.text));
  await prisma.feedback.create({
    data: {
      sessionId, userId: session.userId,
      fluencyScore: parsed.fluencyScore,
      vocabularyScore: parsed.vocabularyScore,
      grammarScore: parsed.grammarScore,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      specificExamples: parsed.specificExamples,
      overallSummary: parsed.overallSummary,
    },
  });
  console.log(`[Feedback] Generated for session ${sessionId}`);
}
