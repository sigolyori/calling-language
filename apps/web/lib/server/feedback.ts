import { z } from "zod";
import { prisma } from "./prisma";
import { getAnthropic, SONNET_MODEL, stripJsonFences } from "./anthropic";
import {
  OPIC_EVALUATOR_SYSTEM,
  OPIC_LEVELS,
  buildOpicEvaluatorUserPrompt,
} from "./prompts/opic-evaluator";

const feedbackSchema = z.object({
  opicLevel: z.enum(OPIC_LEVELS),
  opicRationale: z.string(),
  strengths: z.string(),
  improvements: z.string(),
  specificExamples: z.array(
    z.object({ original: z.string(), corrected: z.string(), note: z.string() }),
  ),
  overallSummary: z.string(),
});

export async function generateFeedback(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { transcript: true, user: true },
  });
  if (!session?.transcript) return;

  const words = session.transcript.rawText.trim().split(/\s+/).filter(Boolean).length;
  if (words < 30) {
    console.log(`[Feedback] Too short (${words} words), skipping ${sessionId}`);
    return;
  }

  const client = getAnthropic();
  if (!client) {
    console.log(`[Feedback] No ANTHROPIC_API_KEY — skipping ${sessionId}`);
    return;
  }

  const msg = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 1500,
    temperature: 0.2,
    system: OPIC_EVALUATOR_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildOpicEvaluatorUserPrompt({
          rawTranscript: session.transcript.rawText,
          selfReportedLevel: session.user.englishLevel,
        }),
      },
    ],
  });

  console.log(
    `[Feedback tokens] session=${sessionId} input=${msg.usage.input_tokens} output=${msg.usage.output_tokens}`,
  );

  const content = msg.content[0];
  if (content.type !== "text") throw new Error("[Feedback] Unexpected response type");

  const cleaned = stripJsonFences(content.text);
  const parsed = feedbackSchema.parse(JSON.parse(cleaned));
  await prisma.feedback.create({
    data: {
      sessionId,
      userId: session.userId,
      opicLevel: parsed.opicLevel,
      opicRationale: parsed.opicRationale,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      specificExamples: parsed.specificExamples,
      overallSummary: parsed.overallSummary,
    },
  });
  console.log(`[Feedback] Generated for session ${sessionId} — level=${parsed.opicLevel}`);
}
