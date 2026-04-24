import { generateFeedback } from "../lib/server/feedback";
import { prisma } from "../lib/server/prisma";

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: tsx scripts/retry-feedback.ts <sessionId>");
  process.exit(1);
}

async function main() {
  console.log(`[retry] generating feedback for ${sessionId}`);
  try {
    await generateFeedback(sessionId);
    console.log("[retry] success");
  } catch (err) {
    console.error("[retry] FAILED:", err);
    throw err;
  }
}

main().catch(() => process.exit(1)).finally(() => prisma.$disconnect());
