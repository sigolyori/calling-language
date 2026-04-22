import { prisma } from "../lib/server/prisma";
import { upsertProfile } from "../lib/server/profiles";

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: tsx apps/web/scripts/seed-profile.ts <userId>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`User ${userId} not found`);
    process.exit(1);
  }

  await upsertProfile(userId, {
    learner_profile: {
      name: user.name,
      level: (user.englishLevel === "advanced"
        ? "advanced"
        : user.englishLevel === "intermediate"
        ? "intermediate"
        : "beginner"),
      english_level_notes: "",
      occupation: "",
      location: "",
      interests: [],
      recurring_topics: [],
      language_goals: "",
    },
    speaking_patterns: {
      common_errors: [],
      improvement_areas: [],
      strengths: [],
      filler_words: [],
    },
    session_history: [],
    open_threads: [],
    excluded_topics: [],
  });

  console.log(`[Seed] Profile seeded for ${user.name} (${userId}). Edit the row in DB to pre-fill interests/goals.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
